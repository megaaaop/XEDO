"""Lossless local evidence package, unreviewed and not registered on the website."""
import json
import math
from pathlib import Path
import numpy as np
import rasterio
from rasterio.features import shapes, rasterize
from rasterio.warp import transform_geom
from shapely.geometry import shape, mapping, Polygon
from shapely.geometry.polygon import orient
from common import PipelineError, encoded, digest, save, grid_limits, now, MODEL_SHA256, RECIPE

def polygons(region, transform, crs, role, limit=256):
    features = []
    for native, value in shapes(region.astype('uint8'), mask=region, transform=transform, connectivity=4):
        if value != 1:
            continue
        if len(features) >= limit:
            raise PipelineError('RESULT_TOO_COMPLEX', f'The {role} layer exceeds {limit} components. Full raster evidence is retained; reduce or split the area.')
        poly = shape(native)
        if not poly.is_valid:
            raise PipelineError('GEOMETRY_INVALID','Raster polygon topology failed validation.')
        ll = orient(shape(transform_geom(crs,'EPSG:4326',mapping(poly),precision=-1)),sign=1)
        if not ll.is_valid:
            raise PipelineError('GEOMETRY_INVALID','Reprojected polygon topology failed validation.')
        features.append({'type':'Feature','id':f'{role}-{len(features)+1:05d}',
            'properties':{'role':role,'areaProjectedM2':poly.area,'areaCrs':str(crs),
                          'pixelCount':round(poly.area/abs(transform.determinant))},'geometry':mapping(ll)})
    return {'type':'FeatureCollection','features':features}

def burn(fc, grid, crs, transform):
    items = [(transform_geom('EPSG:4326',crs,f['geometry'],precision=-1),1) for f in fc['features']]
    return rasterize(items,out_shape=grid,transform=transform,fill=0,all_touched=False,dtype='uint8',skip_invalid=False) if items else np.zeros(grid,dtype='uint8')

def package(directory, summary):
    directory = Path(directory)
    with rasterio.open(directory/'oil_score.tif') as scores, rasterio.open(directory/'oil_candidate_mask.tif') as masks:
        grid_limits(scores.width,scores.height,scores.transform,scores.crs)
        if scores.count != 1 or scores.dtypes != ('float32',) or scores.nodata != -9999 or masks.dtypes != ('uint8',) or masks.nodata != 255:
            raise PipelineError('OUTPUT_FORMAT','Score or mask data type/NoData is invalid.')
        if (scores.width,scores.height,scores.crs,scores.transform) != (masks.width,masks.height,masks.crs,masks.transform):
            raise PipelineError('OUTPUT_GRID','The score and mask grids differ.')
        expected=summary['exported_grid']
        if (scores.width,scores.height,scores.crs.to_string(),list(scores.transform)[:6]) != (expected['width'],expected['height'],expected['crs'],expected['transform']):
            raise PipelineError('OUTPUT_GRID','The summary grid differs from the actual raster grid.')
        score=scores.read(1); mask=masks.read(1); transform=scores.transform; crs=scores.crs
        valid=mask != 255; candidate=mask == 1
        if np.any((scores.read_masks(1)>0)!=valid) or np.any((masks.read_masks(1)>0)!=valid):
            raise PipelineError('OUTPUT_VALIDITY','GDAL masks and stored NoData values disagree.')
        if not valid.any():
            raise PipelineError('NO_VALID_PIXELS','There are no valid SAR pixels in this area.')
        if not np.isin(mask,[0,1,255]).all() or not np.isfinite(score[valid]).all() or np.any((score[valid]<0)|(score[valid]>1)) or np.any(score[~valid] != -9999):
            raise PipelineError('OUTPUT_VALUES','The score/mask validity contract failed.')
        if np.any(candidate[valid] != (score[valid] >= 0.3)) or int(valid.sum()) != summary['valid_pixels'] or int(candidate.sum()) != summary['candidate_pixels']:
            raise PipelineError('OUTPUT_COUNTS','Score threshold, mask and runner counts disagree.')
        groups = {'candidates':polygons(candidate,transform,crs,'candidate'),
                  'valid':polygons(valid,transform,crs,'valid_data'),
                  'nodata':polygons(~valid,transform,crs,'nodata_within_output_grid')}
        reports = {}
        for name, expected in [('candidates',candidate),('valid',valid),('nodata',~valid)]:
            path=directory/(name+'.raw.geojson'); save(path,groups[name])
            delivered=json.loads(path.read_text(encoding='utf-8'))
            mismatch=int(np.count_nonzero(burn(delivered,mask.shape,crs,transform) != expected))
            reports[name]={'roundtripMismatchPixels':mismatch,'components':len(delivered['features'])}
            if mismatch:
                raise PipelineError('GEOMETRY_ROUNDTRIP','Serialized polygon evidence does not reproduce the native raster.')
        grid_poly=Polygon([transform*ij for ij in [(0,0),(scores.width,0),(scores.width,scores.height),(0,scores.height),(0,0)]])
        footprint=mapping(orient(shape(transform_geom(crs,'EPSG:4326',mapping(grid_poly),precision=-1)),sign=1))
    meta=json.loads((directory/'source_metadata.geojson').read_text(encoding='utf-8'))
    props=meta['features'][0]['properties']; aoi=meta['features'][0]['geometry']
    # Pixel centres, not polygon edge clipping: preserve raw raster evidence.
    dense_aoi=mapping(shape(aoi).segmentize(.0005))
    aoi_burn=rasterize([(transform_geom('EPSG:4326',crs,dense_aoi,precision=-1),1)],out_shape=mask.shape,transform=transform,fill=0,all_touched=False,dtype='uint8')
    outside=int(np.count_nonzero(valid & (aoi_burn==0)))
    # GEE/GDAL boundary rasterization can differ at pixel centres near an edge.
    # Record the disagreement, preserving all source pixels rather than clipping.
    native_aoi=shape(transform_geom('EPSG:4326',crs,dense_aoi,precision=-1))
    edge_radius=.5*max(math.hypot(transform.a+transform.b,transform.d+transform.e),math.hypot(transform.a-transform.b,transform.d-transform.e))
    allowed=rasterize([(mapping(native_aoi.buffer(edge_radius+1e-6)),1)],out_shape=mask.shape,transform=transform,fill=0,all_touched=False,dtype='uint8')
    if np.any(valid & (allowed==0)):
        raise PipelineError('VALIDITY_OUTSIDE_AOI','Valid SAR pixels extend beyond the bounded half-pixel AOI edge fringe.')
    features=groups['candidates']['features']
    for feature in features:
        rings=feature['geometry']['coordinates']
        feature['properties'].update({'candidateId':feature['id'],'resultId':summary['run_name'],
            'classification':'analysis_candidate','reviewStatus':'unreviewed','threshold':0.3,
            'interiorRingCount':len(rings)-1,'vertexCountExcludingRingClosures':sum(len(r)-1 for r in rings)})
    coverage={'type':'FeatureCollection','features':groups['valid']['features']+groups['nodata']['features']}
    counts={'total':int(mask.size),'valid':int(valid.sum()),'candidate':int(candidate.sum()),'background':int((mask==0).sum()),'nodata':int((mask==255).sum())}
    source={'collectionId':props['collection_id'],'sceneId':props['scene_id'],'assetId':props['asset_id'],'acquiredAt':props['acquired_utc'].replace(' ','T')+'Z'}
    model={'architecture':'SARUNet','version':None,'checkpointSha256':MODEL_SHA256,'inputBands':['VH','VV'],'inputUnits':'Sigma0_dB','calibrated':False,'preprocessingVersion':RECIPE,'scoreSemantics':'sigmoid output, not calibrated probability'}
    manifest={'schemaVersion':'xedo-local-analysis-manifest/1','resultId':summary['run_name'],'source':source,'model':model,
        'inferenceStartedAt':summary['started_utc'],'inferredAt':summary['completed_utc'],
        'threshold':0.3,'thresholdComparison':'>=','grid':summary['exported_grid'],'pixelCounts':counts,
        'validation':reports,'validPixelCentresOutsideAoi':outside,'allowedAoiEdgeRadiusMetres':edge_radius,
        'aoiEdgePolicy':'retain source pixels; GEE/GDAL boundary fringe bounded to half pixel diagonal; not strict centre containment',
        'localOnly':True,'reviewed':False,
        'artifactHashes':{name:digest(directory/name) for name in ['oil_score.tif','oil_candidate_mask.tif','source_metadata.geojson','summary.json']},
        'hashAuthority':'local producer; not a server-derived website seal','packagedAt':now()}
    result={'schemaVersion':'xedo-local-analysis/1','resultId':summary['run_name'],'kind':'local_sar','source':source,'model':model,
        'acquiredAt':source['acquiredAt'],'inferredAt':summary['completed_utc'],'threshold':0.3,'thresholdComparison':'>=',
        'searchGeometry':aoi,'candidates':groups['candidates'],'coverage':coverage,'footprint':footprint,
        'grid':summary['exported_grid'],'coverageSummary':{'pixelCounts':counts,'validPercentOfOutputGrid':counts['valid']/counts['total']*100,
        'sourceSceneFootprintCoveragePctOfAoi':props.get('footprint_coverage_pct')},
        'accuracyValidatedOnGEE':False,'limitations':summary.get('warnings',[]),'manifest':manifest,'reviewStatus':'unreviewed','serverRegistered':False}
    save(directory/'local-manifest.json',manifest)
    vertex_count=sum(sum(len(r) for r in f['geometry']['coordinates']) for f in features+coverage['features'])
    if vertex_count>8192 or len(encoded(result))>512*1024 or any(len(f['geometry']['coordinates'])>64 for f in features+coverage['features']) or any(len(r)>4097 for f in features+coverage['features'] for r in f['geometry']['coordinates']):
        raise PipelineError('RESULT_TOO_COMPLEX','The complete review geometry exceeds the pilot vertex/byte limit. Full raster and generated geometry are retained locally.')
    save(directory/'analysis.local.json',result)
    return {'resultId':summary['run_name'],'candidateComponents':len(features),'pixelCounts':counts,
            'roundtrip':reports,'reviewCatalogBytes':len(encoded(result)),'geometryVertices':vertex_count,'localOnly':True}
