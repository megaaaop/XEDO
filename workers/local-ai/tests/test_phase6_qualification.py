"""No-network qualification probes against the current checkout implementation.

Synthetic fixtures are software tests, not GEE
observations, model runs, production Auth, or field-accuracy evidence.
"""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'workers/local-ai'))
import numpy as np
import rasterio
from affine import Affine
from common import PipelineError, save
import acquisition
from package_result import package

HERE=Path(__file__).resolve().parent
TEMP=ROOT/'output/local-ai-phase6-tests';TEMP.mkdir(parents=True,exist_ok=True)
tempfile.tempdir=str(TEMP)
AREA={'type':'Polygon','coordinates':[[[101.13,12.60],[101.15,12.60],[101.15,12.62],[101.13,12.62],[101.13,12.60]]]}

class Value:
    def __init__(self,value):self.value=value
    def getInfo(self):return self.value

class Scene:
    def toDictionary(self,fields):
        return Value({'system:index':'software_scene','system:time_start':1793055637000,'xedo_coverage':1})
    def select(self,band):
        return self.Band(band)
    class Band:
        def __init__(self,name):self.name=name
        def projection(self):return Value({'crs':'EPSG:32647','transform':[10,0,0 if self.name=='VH' else 10,0,-10,0]})

class Collection:
    def __init__(self,count):self.count=count
    def filterBounds(self,*args):return self
    def filterDate(self,*args):return self
    def filter(self,*args):return self
    def map(self,*args):return self
    def size(self):return Value(self.count)
    def aggregate_max(self,*args):return 1
    def sort(self,*args):return self
    def first(self):return Scene()

class EE:
    def __init__(self,count):self.count=count
    def Geometry(self,*args,**kwargs):return object()
    def ImageCollection(self,*args):return Collection(self.count)
    def Image(self,*args):return Scene()
    class Filter:
        @staticmethod
        def eq(*args):return ('eq',args)
        @staticmethod
        def gte(*args):return ('gte',args)
        @staticmethod
        def listContains(*args):return ('listContains',args)

def fixture(folder,mask,scene='software-fixture'):
    transform=Affine(10,0,738000,0,-10,1390000)
    scores=np.where(mask==255,-9999,np.where(mask==1,.5,.1)).astype('float32')
    for name,array,dtype,nodata in [('oil_score.tif',scores,'float32',-9999),('oil_candidate_mask.tif',mask,'uint8',255)]:
        with rasterio.open(folder/name,'w',driver='GTiff',width=mask.shape[1],height=mask.shape[0],count=1,dtype=dtype,nodata=nodata,crs='EPSG:32647',transform=transform) as target:target.write(array,1)
    source={'collection_id':'SYNTHETIC','scene_id':scene,'asset_id':'SYNTHETIC/'+scene,'acquired_utc':'2026-10-01 00:00:00','footprint_coverage_pct':50.0}
    save(folder/'source_metadata.geojson',{'type':'FeatureCollection','features':[{'type':'Feature','geometry':{'type':'Polygon','coordinates':[[[100,11],[103,11],[103,14],[100,14],[100,11]]]},'properties':source}]})
    summary={'valid_pixels':int((mask!=255).sum()),'candidate_pixels':int((mask==1).sum()),'run_name':'synthetic-phase6',
      'started_utc':'2026-10-01T00:00:00Z','completed_utc':'2026-10-01T00:00:01Z',
      'exported_grid':{'width':mask.shape[1],'height':mask.shape[0],'crs':'EPSG:32647','transform':list(transform)[:6]}}
    save(folder/'summary.json',summary)
    return summary

class Phase6QualificationTests(unittest.TestCase):
    def test_no_sar_has_typed_error_without_creating_download_directory(self):
        with tempfile.TemporaryDirectory() as temp:
            destination=Path(temp)/'inputs';events=[]
            with patch.object(acquisition,'connect',return_value=(EE(0),{})),patch.object(acquisition,'crop_grid') as crop:
                with self.assertRaises(PipelineError) as caught:acquisition.acquire({'geometry':AREA,'start':'1900-01-01','end':'1900-01-01','jobId':'fixture'},destination,Path(temp)/'.env',lambda stage,detail=None:events.append(stage))
            self.assertEqual(caught.exception.code,'NO_SAR_SCENE');self.assertFalse(destination.exists());crop.assert_not_called();self.assertEqual(events,['searching'])

    def test_mismatched_native_vh_vv_grid_stops_before_download(self):
        with tempfile.TemporaryDirectory() as temp:
            destination=Path(temp)/'inputs'
            with patch.object(acquisition,'connect',return_value=(EE(1),{})),patch.object(acquisition,'crop_grid') as crop:
                with self.assertRaises(PipelineError) as caught:acquisition.acquire({'geometry':AREA,'start':'2026-10-01','end':'2026-10-30','jobId':'fixture'},destination,Path(temp)/'.env',lambda *args:None)
            self.assertEqual(caught.exception.code,'BAND_GRID_MISMATCH');self.assertFalse(destination.exists());crop.assert_not_called()

    def test_partial_nodata_preserves_native_grid_and_both_coverage_roles(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp);mask=np.zeros((4,4),dtype='uint8');mask[2:,:]=255
            summary=fixture(folder,mask);result=package(folder,summary);catalog=json.loads((folder/'analysis.local.json').read_text())
            self.assertEqual(result['candidateComponents'],0);self.assertEqual(result['pixelCounts'],{'total':16,'valid':8,'candidate':0,'background':8,'nodata':8})
            self.assertEqual(catalog['coverageSummary']['sourceSceneFootprintCoveragePctOfAoi'],50.0)
            self.assertEqual(catalog['coverageSummary']['validPercentOfOutputGrid'],50.0)
            self.assertEqual({f['properties']['role'] for f in catalog['coverage']['features']},{'valid_data','nodata_within_output_grid'})
            self.assertEqual(catalog['grid'],summary['exported_grid']);self.assertTrue(all(r['roundtripMismatchPixels']==0 for r in result['roundtrip'].values()))
            self.assertFalse(catalog['serverRegistered']);self.assertFalse(catalog['accuracyValidatedOnGEE'])

    def test_entirely_nodata_is_failure_not_zero_candidate_success(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp);summary=fixture(folder,np.full((4,4),255,dtype='uint8'))
            with self.assertRaises(PipelineError) as caught:package(folder,summary)
            self.assertEqual(caught.exception.code,'NO_VALID_PIXELS');self.assertFalse((folder/'analysis.local.json').exists())

    def test_single_component_complex_boundary_is_not_silently_simplified(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp);mask=np.zeros((4,4095),dtype='uint8');mask[0,:]=1;mask[:,::2]=1;summary=fixture(folder,mask)
            with self.assertRaises(PipelineError) as caught:package(folder,summary)
            self.assertEqual(caught.exception.code,'RESULT_TOO_COMPLEX');self.assertTrue((folder/'oil_candidate_mask.tif').exists());self.assertFalse((folder/'analysis.local.json').exists())
            raw=json.loads((folder/'candidates.raw.geojson').read_text());self.assertEqual(len(raw['features']),1)
            self.assertGreater(len(raw['features'][0]['geometry']['coordinates'][0]),4097)

    def test_payload_byte_cap_keeps_full_raster_and_does_not_publish_partial_catalog(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp);summary=fixture(folder,np.ones((2,2),dtype='uint8'),scene='x'*300000)
            with self.assertRaises(PipelineError) as caught:package(folder,summary)
            self.assertEqual(caught.exception.code,'RESULT_TOO_COMPLEX');self.assertFalse((folder/'analysis.local.json').exists());self.assertTrue((folder/'oil_score.tif').exists())

if __name__=='__main__':unittest.main(verbosity=2)
