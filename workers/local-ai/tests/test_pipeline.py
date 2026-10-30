import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import json
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
import rasterio
from affine import Affine
from common import PipelineError, geometry, grid_limits, save
from acquisition import crop_grid, dates, normalize_tiff, compute_tiff, canonicalize_invalid_data
from package_result import package

# Windows app-container temporary folders can deny atomic file replacement.
# Keep test artifacts in the ignored workspace output directory.
TEST_TEMP=Path(__file__).resolve().parents[3]/'output/local-ai-tests'
TEST_TEMP.mkdir(parents=True,exist_ok=True)
tempfile.tempdir=str(TEST_TEMP)

AREA={'type':'Polygon','coordinates':[[[101.13,12.60],[101.15,12.60],[101.15,12.62],[101.13,12.62],[101.13,12.60]]]}

class LocalPipelineTests(unittest.TestCase):
    def test_valid_area_and_invalid_topology(self):
        self.assertEqual(geometry(AREA)['type'],'Polygon')
        for coords in [[[[0,0],[1,1],[1,0],[0,1],[0,0]]], [[[float('nan'),0],[1,0],[1,1],[float('nan'),0]]]]:
            with self.assertRaises(PipelineError):geometry({'type':'Polygon','coordinates':coords})

    def test_oversized_export_rectangle_and_dimensions(self):
        for w,h in [(2001,1000),(4097,1),(0,1)]:
            with self.assertRaises(PipelineError):grid_limits(w,h,Affine(10,0,0,0,-10,0),'EPSG:32647')
        with self.assertRaises(PipelineError):grid_limits(10,10,Affine(.1,0,0,0,-.1,0),'EPSG:4326')

    def test_crop_uses_native_integer_offsets_and_explicit_dimensions(self):
        source=Affine(10,0,546653.2274242942,0,-10,1569728.152845362)
        g=crop_grid(AREA,'EPSG:32647',list(source)[:6]); crop=Affine(*g['transform'])
        col,row=(~source)*(crop.c,crop.f)
        self.assertAlmostEqual(col,round(col),places=7); self.assertAlmostEqual(row,round(row),places=7)
        self.assertNotEqual(list(source)[:6],g['transform'])
        self.assertGreater(g['width'],200);self.assertLess(g['width']*g['height'],2_000_000)

    def test_dates_order_window_and_no_future(self):
        self.assertEqual(dates('2026-10-01','2026-10-02'),('2026-10-01','2026-10-02','2026-10-03'))
        for start,end in [('2026-10-02','2026-10-01'),('2025-01-01','2026-10-01'),('2026-10-01','2099-01-01')]:
            with self.assertRaises(PipelineError):dates(start,end)

    def test_bounded_compute_request_and_bad_response(self):
        g={'crs':'EPSG:32647','transform':[10,0,738000,0,-10,1390000],'width':4,'height':3}
        captured=[]
        def fake(request):captured.append(request);return b'II*\x00test'
        self.assertEqual(compute_tiff(fake,'expression',g,'data'),b'II*\x00test')
        self.assertEqual(captured[0]['bandIds'],['VH','VV'])
        self.assertEqual(captured[0]['grid']['affineTransform']['translateX'],738000)
        self.assertEqual(captured[0]['grid']['dimensions'],{'width':4,'height':3})
        for payload in [b'<html>error</html>',b'II*',{'error':'not a tiff'}]:
            with self.assertRaises(PipelineError):compute_tiff(lambda request:payload,'expr',g,'data')
        with patch('acquisition.MAX_DOWNLOAD_BYTES',4):
            with self.assertRaises(PipelineError):compute_tiff(fake,'expr',g,'data')

    def test_malformed_geojson_returns_typed_error(self):
        for value in [None,[],5,{'type':'Feature','geometry':None},{'type':'FeatureCollection','features':[None]}]:
            with self.assertRaises(PipelineError) as caught:geometry(value)
            self.assertEqual(caught.exception.code,'AOI_INVALID')

    def test_lossless_nodata_rewrite_and_wrong_grid(self):
        with tempfile.TemporaryDirectory() as d:
            original=Path(d)/'original.tif'; output=Path(d)/'out.tif'
            transform=Affine(10,0,738000,0,-10,1390000)
            values=np.arange(24,dtype='float32').reshape(2,3,4)
            with rasterio.open(original,'w',driver='GTiff',width=4,height=3,count=2,dtype='float32',crs='EPSG:32647',transform=transform) as dst:dst.write(values)
            g={'crs':'EPSG:32647','transform':list(transform)[:6],'width':4,'height':3}
            normalize_tiff(original,output,g,'data')
            with rasterio.open(output) as src:
                self.assertEqual(src.nodata,-9999);np.testing.assert_array_equal(src.read(),values)
            with self.assertRaises(PipelineError):normalize_tiff(original,output,{**g,'width':5},'data')
            with rasterio.open(original,'r+') as src:src.nodata=-32768
            with self.assertRaises(PipelineError) as caught:normalize_tiff(original,output,g,'data')
            self.assertEqual(caught.exception.code,'INPUT_NODATA')

    def test_scale_validity_dtype_and_invalid_values(self):
        with tempfile.TemporaryDirectory() as d:
            original=Path(d)/'original.tif';output=Path(d)/'out.tif';t=Affine(10,0,738000,0,-10,1390000)
            g={'crs':'EPSG:32647','transform':list(t)[:6],'width':2,'height':2}
            with rasterio.open(original,'w',driver='GTiff',width=2,height=2,count=1,dtype='uint8',crs='EPSG:32647',transform=t) as dst:dst.write(np.full((2,2),2,dtype='uint8'),1)
            with self.assertRaises(PipelineError) as caught:normalize_tiff(original,output,g,'valid')
            self.assertEqual(caught.exception.code,'INPUT_VALIDITY')
            with rasterio.open(original,'r+') as dst:dst.scales=(.5,)
            with self.assertRaises(PipelineError) as caught:normalize_tiff(original,output,g,'valid')
            self.assertEqual(caught.exception.code,'INPUT_SCALE')

    def test_canonical_nodata_changes_only_invalid_cells(self):
        with tempfile.TemporaryDirectory() as d:
            data=Path(d)/'data.tif';valid=Path(d)/'valid.tif';t=Affine(10,0,738000,0,-10,1390000)
            values=np.array([[[-20,0],[-9999,-18]],[[-30,0],[-9999,-28]]],dtype='float32');mask=np.array([[1,0],[0,1]],dtype='uint8')
            for path,array,count,typ,nodata in [(data,values,2,'float32',-9999),(valid,mask[None],1,'uint8',0)]:
                with rasterio.open(path,'w',driver='GTiff',width=2,height=2,count=count,dtype=typ,nodata=nodata,crs='EPSG:32647',transform=t) as dst:dst.write(array)
            self.assertEqual(canonicalize_invalid_data(data,valid),2)
            with rasterio.open(data) as src:
                np.testing.assert_array_equal(src.read()[:,mask==1],values[:,mask==1]);self.assertTrue((src.read()[:,mask==0]==-9999).all())

    def test_output_internal_mask_and_summary_grid_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            directory=Path(d);summary=self.make_result(directory,np.ones((2,2),dtype='uint8'))
            with rasterio.open(directory/'oil_score.tif','r+') as dst:dst.write_mask(np.zeros((2,2),dtype='uint8'))
            with self.assertRaises(PipelineError) as caught:package(directory,summary)
            self.assertEqual(caught.exception.code,'OUTPUT_VALIDITY')
        with tempfile.TemporaryDirectory() as d:
            directory=Path(d);summary=self.make_result(directory,np.ones((2,2),dtype='uint8'));summary['exported_grid']['width']=3
            with self.assertRaises(PipelineError) as caught:package(directory,summary)
            self.assertEqual(caught.exception.code,'OUTPUT_GRID')

    def make_result(self,d,mask):
        transform=Affine(10,0,738000,0,-10,1390000)
        score=np.where(mask==255,-9999,np.where(mask==1,.5,.1)).astype('float32')
        for name,values,typ,nodata in [('oil_score.tif',score,'float32',-9999),('oil_candidate_mask.tif',mask,'uint8',255)]:
            with rasterio.open(d/name,'w',driver='GTiff',width=mask.shape[1],height=mask.shape[0],count=1,dtype=typ,nodata=nodata,crs='EPSG:32647',transform=transform) as dst:dst.write(values,1)
        # This synthetic software fixture intentionally has a broad covering AOI.
        source={'collection_id':'SYNTHETIC','scene_id':'software-fixture','asset_id':'SYNTHETIC/fixture','acquired_utc':'2026-10-01 00:00:00'}
        save(d/'source_metadata.geojson',{'type':'FeatureCollection','features':[{'type':'Feature','geometry':{'type':'Polygon','coordinates':[[[100,11],[103,11],[103,14],[100,14],[100,11]]]},'properties':source}]})
        summary={'valid_pixels':int((mask!=255).sum()),'candidate_pixels':int((mask==1).sum()),'run_name':'synthetic-software-test',
            'started_utc':'2026-10-01T00:00:00Z','completed_utc':'2026-10-01T00:00:01Z',
            'exported_grid':{'width':mask.shape[1],'height':mask.shape[0],'crs':'EPSG:32647','transform':list(transform)[:6]}}
        save(d/'summary.json',summary)
        return summary

    def test_holes_diagonal_zero_candidates_and_nodata_roundtrip(self):
        cases=[np.zeros((5,5),dtype='uint8'), np.array([[1,0],[0,1]],dtype='uint8'),np.array([[1,1,1],[1,0,1],[1,1,1]],dtype='uint8'),np.array([[255,0],[0,1]],dtype='uint8')]
        for i,mask in enumerate(cases):
            with self.subTest(i=i),tempfile.TemporaryDirectory() as temp:
                directory=Path(temp);summary=self.make_result(directory,mask);result=package(directory,summary)
                self.assertTrue(all(v['roundtripMismatchPixels']==0 for v in result['roundtrip'].values()))
                self.assertEqual(result['pixelCounts']['candidate'],int((mask==1).sum()))
                if i==1:self.assertEqual(result['candidateComponents'],2)
                if i==2:
                    doc=json.loads((directory/'analysis.local.json').read_text());self.assertEqual(doc['candidates']['features'][0]['properties']['interiorRingCount'],1)

    def test_zero_valid_and_threshold_corruption_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            directory=Path(temp);summary=self.make_result(directory,np.full((2,2),255,dtype='uint8'))
            with self.assertRaises(PipelineError) as caught:package(directory,summary)
            self.assertEqual(caught.exception.code,'NO_VALID_PIXELS')
        with tempfile.TemporaryDirectory() as temp:
            directory=Path(temp);summary=self.make_result(directory,np.ones((2,2),dtype='uint8'))
            with rasterio.open(directory/'oil_score.tif','r+') as dst:dst.write(np.full((2,2),.1,dtype='float32'),1)
            with self.assertRaises(PipelineError) as caught:package(directory,summary)
            self.assertEqual(caught.exception.code,'OUTPUT_COUNTS')

    def test_complexity_is_explicit_without_silent_trimming(self):
        with tempfile.TemporaryDirectory() as temp:
            directory=Path(temp);mask=np.zeros((40,40),dtype='uint8');mask[::2,::2]=1
            summary=self.make_result(directory,mask)
            with self.assertRaises(PipelineError) as caught:package(directory,summary)
            self.assertEqual(caught.exception.code,'RESULT_TOO_COMPLEX')
            self.assertTrue((directory/'oil_candidate_mask.tif').exists())
            self.assertFalse((directory/'analysis.local.json').exists())

if __name__=='__main__':unittest.main()
