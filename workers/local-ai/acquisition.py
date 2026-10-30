"""Single-scene GEE download. No exports, buckets, uploads or paid resources."""
from __future__ import annotations
import math
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import numpy as np
import rasterio
from affine import Affine
from rasterio.warp import transform_bounds
from shapely.geometry import shape
from common import PipelineError, MODEL_SHA256, RECIPE, MAX_DOWNLOAD_BYTES, geometry, grid_limits, local_config, now, save, digest

def dates(start=None, end=None):
    try:
        last = date.fromisoformat(end) if end else datetime.now(timezone.utc).date()
        first = date.fromisoformat(start) if start else last - timedelta(days=30)
        if not 0 <= (last-first).days <= 90 or last > datetime.now(timezone.utc).date():
            raise ValueError()
        return first.isoformat(), last.isoformat(), (last+timedelta(days=1)).isoformat()
    except ValueError:
        raise PipelineError('DATE_INVALID', 'Use an ordered SAR date range of at most 90 days, ending today or earlier.') from None

def connect(env_file):
    import ee
    from google.auth.transport.requests import AuthorizedSession
    project, raw, email = local_config(env_file)
    credentials = ee.ServiceAccountCredentials(email, key_data=raw)
    session = AuthorizedSession(credentials)
    response = session.get(f'https://earthengine.googleapis.com/v1/projects/{project}/config', timeout=30)
    if response.status_code != 200:
        raise PipelineError('GEE_ACCESS_DENIED', 'The existing GEE project is not accessible. No service was enabled.')
    registration = response.json().get('registrationState')
    if registration != 'REGISTERED_NOT_COMMERCIALLY':
        raise PipelineError('GEE_REGISTRATION', 'This no-Billing pilot requires the existing noncommercial GEE registration.')
    ee.Initialize(credentials, project=project)
    ee.data.setDeadline(90000)
    ee.data.setMaxRetries(1)
    return ee, {'project': project, 'registrationState': registration, 'checkedAt': now(), 'noBillingOrServiceChanges': True}

def crop_grid(aoi, source_crs, source_transform):
    from rasterio.crs import CRS
    native = Affine(*source_transform)
    grid_limits(1, 1, native, source_crs)
    west,south,east,north = shape(aoi).bounds
    left,bottom,right,top = transform_bounds('EPSG:4326',source_crs,west,south,east,north,densify_pts=41)
    inv = ~native
    corners = [inv*(x,y) for x,y in ((left,bottom),(left,top),(right,bottom),(right,top))]
    col = math.floor(min(p[0] for p in corners)); row = math.floor(min(p[1] for p in corners))
    width = math.ceil(max(p[0] for p in corners))-col
    height = math.ceil(max(p[1] for p in corners))-row
    cropped = native * Affine.translation(col,row)
    grid_limits(width,height,cropped,source_crs)
    return {'crs': CRS.from_user_input(source_crs).to_string(), 'transform': list(cropped)[:6], 'width':width,'height':height,
            'sourceTransform':list(native)[:6], 'gridAreaKm2':width*height*abs(native.determinant)/1e6}

def compute_tiff(compute, source, grid, kind):
    grid_limits(grid['width'],grid['height'],Affine(*grid['transform']),grid['crs'])
    a,b,c,d,e,f=grid['transform']
    pixel_grid={'crsCode':grid['crs'],'dimensions':{'width':grid['width'],'height':grid['height']},
                'affineTransform':{'scaleX':a,'shearX':b,'translateX':c,'shearY':d,'scaleY':e,'translateY':f}}
    payload=compute({'expression':source,'fileFormat':'GEO_TIFF','grid':pixel_grid,
                     'bandIds':['VH','VV'] if kind=='data' else ['valid'],'workloadTag':'xedo-local-'+kind})
    if not isinstance(payload,bytes) or len(payload)>MAX_DOWNLOAD_BYTES:
        raise PipelineError('DOWNLOAD_LIMIT','GEE pixel response exceeds the bounded byte contract.')
    if len(payload)<8 or payload[:4] not in (b'II*\x00',b'MM\x00*',b'II+\x00',b'MM\x00+'):
        raise PipelineError('DOWNLOAD_FORMAT','GEE did not return the requested GeoTIFF.')
    return payload

def normalize_tiff(downloaded, destination, grid, kind):
    """Add canonical NoData metadata without resampling or changing band values."""
    wanted_dtype = 'float32' if kind == 'data' else 'uint8'
    count = 2 if kind == 'data' else 1
    nodata = -9999 if kind == 'data' else 0
    with rasterio.open(downloaded) as source:
        if source.driver != 'GTiff' or source.count != count or any(v != wanted_dtype for v in source.dtypes):
            raise PipelineError('INPUT_FORMAT', 'The download band type/count is invalid.')
        if source.nodata is not None and source.nodata != nodata:
            raise PipelineError('INPUT_NODATA','The download has an unexpected NoData sentinel.')
        expected = Affine(*grid['transform'])
        if source.crs != rasterio.crs.CRS.from_user_input(grid['crs']) or source.transform != expected or (source.width,source.height) != (grid['width'],grid['height']):
            raise PipelineError('INPUT_GRID', 'The downloaded grid differs from the requested native crop.')
        if any(v != 1 for v in source.scales) or any(v != 0 for v in source.offsets):
            raise PipelineError('INPUT_SCALE', 'The download has an unexpected scale/offset.')
        data = source.read()
        if kind == 'valid' and not np.isin(data,[0,1]).all():
            raise PipelineError('INPUT_VALIDITY', 'VALID must contain only zero and one.')
        profile = source.profile.copy()
        profile.update(nodata=nodata, compress='deflate')
        with rasterio.open(destination,'w',**profile) as target:
            target.write(data)
            for n, name in enumerate(['VH','VV'] if kind == 'data' else ['valid'],1):
                target.set_band_description(n,name)
    with rasterio.open(destination) as target:
        if not np.array_equal(data,target.read(),equal_nan=True):
            raise PipelineError('INPUT_REWRITE', 'Lossless NoData metadata normalization changed pixel values.')

def canonicalize_invalid_data(data_path, valid_path):
    """GEE may store zero behind clipped masks. Canonicalize only VALID=0 cells."""
    with rasterio.open(valid_path) as validity,rasterio.open(data_path,'r+') as data:
        if (validity.width,validity.height,validity.crs,validity.transform)!=(data.width,data.height,data.crs,data.transform):
            raise PipelineError('INPUT_GRID','DATA and VALID do not share the exact native grid.')
        valid=validity.read(1)==1
        values=data.read()
        if not np.isfinite(values[:,valid]).all() or np.any(values[:,valid]==-9999):
            raise PipelineError('INPUT_VALIDITY','VALID includes a missing or non-finite SAR band.')
        original_valid=values[:,valid].copy()
        changed=int(np.count_nonzero(values[:,~valid]!=-9999))
        values[:,~valid]=-9999
        data.write(values)
    with rasterio.open(data_path) as data:
        if not np.array_equal(original_valid,data.read()[:,valid]):
            raise PipelineError('INPUT_REWRITE','Canonical NoData conversion changed a valid SAR value.')
    return changed

def acquire(spec, directory, env_file, emit):
    ee, readiness = connect(env_file)
    aoi = geometry(spec['geometry'])
    first,last,stop = dates(spec.get('start'),spec.get('end'))
    region = ee.Geometry(aoi, proj='EPSG:4326', geodesic=False)
    emit('searching',{'start':first,'endInclusive':last})
    collection = (ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(region).filterDate(first,stop)
                  .filter(ee.Filter.eq('instrumentMode','IW')).filter(ee.Filter.eq('resolution_meters',10))
                  .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VH'))
                  .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VV')))
    if spec.get('scene'):
        scene = spec['scene']
        if not scene.startswith('COPERNICUS/S1_GRD/') or len(scene.split('/')) != 3:
            raise PipelineError('SCENE_INVALID','Use a complete Sentinel-1 collection asset ID.')
        collection = collection.filter(ee.Filter.eq('system:index',scene.split('/')[-1]))
    def annotated(image):
        ratio = image.geometry().intersection(region,1).area(1).divide(region.area(1))
        return image.set('xedo_coverage',ratio)
    options = collection.map(annotated)
    fully = options.filter(ee.Filter.gte('xedo_coverage',0.999))
    if not options.size().getInfo():
        raise PipelineError('NO_SAR_SCENE','No qualifying VH/VV SAR acquisition covers this area/date range.')
    full_count = fully.size().getInfo()
    best=fully if full_count else options.filter(ee.Filter.eq('xedo_coverage',options.aggregate_max('xedo_coverage')))
    latest=best.aggregate_max('system:time_start')
    selected=best.filter(ee.Filter.eq('system:time_start',latest)).sort('system:index').first()
    info = selected.toDictionary(['system:index','system:time_start','orbitProperties_pass','relativeOrbitNumber_start','platform_number','xedo_coverage']).getInfo()
    if not info or not info.get('system:index'):
        raise PipelineError('NO_SAR_SCENE','No qualifying VH/VV SAR acquisition covers this area/date range.')
    asset = 'COPERNICUS/S1_GRD/'+info['system:index']
    image = ee.Image(asset)
    vh = image.select('VH').projection().getInfo(); vv = image.select('VV').projection().getInfo()
    if vh != vv:
        raise PipelineError('BAND_GRID_MISMATCH','VH and VV do not share one native grid.')
    grid = crop_grid(aoi,vh['crs'],vh['transform'])
    raw = image.select(['VH','VV']).toFloat().clip(region)
    valid = raw.mask().reduce(ee.Reducer.min()).gt(0).rename('valid')
    data = raw.updateMask(valid).unmask(-9999,False).clip(region)
    validity = valid.unmask(0,False).clip(region).toUint8()
    # Existing project credential permits computations but not thumbnails.create.
    # computePixels returns the exact bounded grid directly, with no temporary
    # thumbnail/export resource, no IAM grant, and no Drive/GCS task.
    directory = Path(directory); directory.mkdir(parents=True,exist_ok=False)
    job = spec['jobId']; data_path=directory/(job+'_VH_VV.tif'); valid_path=directory/(job+'_VALID.tif')
    for kind, source, destination in [('data',data,data_path),('valid',validity,valid_path)]:
        emit('downloading',{'part':kind,'grid':grid})
        temporary = directory/(kind+'.download.tif')
        payload=compute_tiff(ee.data.computePixels,source,grid,kind)
        temporary.write_bytes(payload)
        normalize_tiff(temporary,destination,grid,kind)
        temporary.unlink()
    invalid_values_changed=canonicalize_invalid_data(data_path,valid_path)
    acquired = datetime.fromtimestamp(info['system:time_start']/1000,timezone.utc)
    props = {'source':'Google Earth Engine','collection_id':'COPERNICUS/S1_GRD','asset_id':asset,'scene_id':info['system:index'],
             'acquired_utc':acquired.strftime('%Y-%m-%d %H:%M:%S'),'orbit_pass':info.get('orbitProperties_pass'),
             'relative_orbit':info.get('relativeOrbitNumber_start'),'platform':info.get('platform_number'),
             'instrument_mode':'IW','resolution_filter_m':10,'band_order':['VH','VV'],'units':'Sigma0_dB','dtype':'float32',
             'nodata_value':-9999,'crs':vh['crs'],'crs_transform':vh['transform'],'nominal_pixel_scale_m':10,
             'query_start_utc':first,'query_end_inclusive_utc':last,'aoi_area_km2':region.area(1).divide(1e6).getInfo(),
             'footprint_coverage_pct':info['xedo_coverage']*100,'validity_definition':'intersection of VH and VV masks, inside AOI; 1 valid, 0 invalid',
             'data_file_prefix':job+'_VH_VV','validity_file_prefix':job+'_VALID','recipe_version':'1.1.1',
             'export_requested_utc':now(),'xedo_job_id':job,'analysis_threshold':0.3,'analysis_model_sha256':MODEL_SHA256,
             'model_inference_performed':False,'local_acquisition_recipe':RECIPE,
             'compatibility_note':'GEE export; not SNAP DIMAP. Field accuracy and GEE-to-training compatibility are not established.'}
    metadata_path = directory/(job+'_METADATA.geojson')
    save(metadata_path,{'type':'FeatureCollection','features':[{'type':'Feature','geometry':aoi,'properties':props}]})
    save(directory/'acquisition-receipt.json',{'readiness':readiness,'sourceAsset':asset,'grid':grid,'singleScene':True,
        'files':{p.name:{'bytes':p.stat().st_size,'sha256':digest(p)} for p in (data_path,valid_path,metadata_path)},
        'downloadMethod':'GEE computePixels GEO_TIFF on exact native grid',
        'invalidBandValuesCanonicalizedToNoData':invalid_values_changed,'validSarValuesUnchanged':True,
        'resamplingPerformed':False,'driveTasksCreated':False,'cloudStorageResourcesCreated':False})
    return data_path, valid_path, metadata_path
