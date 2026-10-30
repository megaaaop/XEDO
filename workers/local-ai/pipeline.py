"""Local-only commands. No queue, web publication or paid provisioning."""
from __future__ import annotations
import argparse
import importlib.metadata
import json
import os
from pathlib import Path
import shutil
import sys
import threading
import time
import uuid
from common import PipelineError, ENGINE_SHA256, MODEL_SHA256, RECIPE, digest, geometry, grid_limits, now, save

ROOT=Path(__file__).resolve().parents[2]

def engine():
    path=Path(__file__).parent/'vendor/gee_sar_inference.py'
    if digest(path)!=ENGINE_SHA256:
        raise PipelineError('ENGINE_HASH','The audited inference source was changed.')
    import importlib.util
    spec=importlib.util.spec_from_file_location('xedo_audited_engine',path)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module

def run(args):
    import psutil
    from acquisition import acquire, dates, connect
    started=time.perf_counter(); process=psutil.Process(); samples=[]; stop=threading.Event()
    def sample():
        while not stop.wait(.05):
            samples.append(process.memory_info().rss)
    thread=threading.Thread(target=sample,daemon=True);thread.start()
    output=Path(args.output).resolve();output.mkdir(parents=True,exist_ok=True)
    job='XEDO_LOCAL_'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'_'+uuid.uuid4().hex[:8]
    work=output/job;work.mkdir(exist_ok=False)
    receipt={'jobId':job,'startedAt':now(),'status':'running','localOnly':True,'recipe':RECIPE,'stages':[],
             'billingChanged':False,'subscriptionCreated':False,'cloudResourcesCreated':False,'websiteOrDatabaseChanged':False,'pushDeploy':False}
    def emit(stage,detail=None):
        receipt['stages'].append({'stage':stage,'at':now(),'elapsedSeconds':time.perf_counter()-started,**(detail or {})})
        save(work/'run-receipt.json',receipt)
        print(json.dumps({'stage':stage,**(detail or {})},ensure_ascii=True),flush=True)
    try:
        if shutil.disk_usage(work).free<1024**3:
            raise PipelineError('DISK_LOW','At least 1 GiB free local disk is required.')
        if digest(args.model)!=MODEL_SHA256:
            raise PipelineError('MODEL_HASH','The checkpoint differs from the audited model.')
        if args.metadata:
            # Explicit replay: never present existing local files as a fresh download.
            runner=engine(); data,valid,metadata=runner.find_input_files(args.metadata)
            receipt['acquisitionMode']='existing_triplet_replay'
        else:
            if not args.area:
                raise PipelineError('AOI_REQUIRED','Choose an area GeoJSON file.')
            area_file=Path(args.area)
            if area_file.stat().st_size>65536:
                raise PipelineError('AOI_INVALID','The area file is too large.')
            area=geometry(json.loads(area_file.read_text(encoding='utf-8-sig')))
            first,last,_=dates(args.start,args.end)
            spec={'jobId':job,'geometry':area,'start':first,'end':last,'scene':args.scene}
            save(work/'request.json',spec)
            receipt['acquisitionMode']='automatic_gee_single_scene'
            data,valid,metadata=acquire(spec,work/'inputs',args.env_file,emit)
            runner=engine()
        emit('validating_input')
        props,document,grid=runner.validate_inputs(data,valid,metadata)
        from affine import Affine
        grid_limits(grid['width'],grid['height'],Affine(*grid['transform']),grid['crs'])
        import numpy as np
        import rasterio
        with rasterio.open(data) as src, rasterio.open(valid) as val:
            values=src.read(); valid_values=val.read(1)
            if not np.isin(valid_values,[0,1]).all():
                raise PipelineError('INPUT_VALIDITY','VALID must contain only zero and one.')
            actual=(valid_values==1)&(src.read_masks()>0).all(axis=0)&np.isfinite(values).all(axis=0)&(values!=-9999).all(axis=0)
            if not actual.any():
                raise PipelineError('NO_VALID_PIXELS','No pixels contain both valid VH and VV data.')
            if np.any((valid_values==1) != actual):
                raise PipelineError('INPUT_VALIDITY','VALID disagrees with finite DATA masks/NoData.')
        emit('loading_model')
        runner.torch.set_num_threads(args.threads);runner.torch.set_num_interop_threads(1)
        model,norm,contract=runner.load_model(args.model,device='cpu')
        emit('inferencing',{'device':contract['device'],'threads':args.threads,'grid':grid})
        out,summary=runner.run_inference(model,norm,contract,data,valid,metadata,work/'model-outputs',threshold=.3,batch_size=1,
            progress=lambda count,total:emit('inferencing',{'processedTiles':count,'totalTiles':total}))
        # The audited engine skips callbacks for empty trailing tiles. Report its
        # verified final count without changing any inference mathematics.
        import math
        emit('inferencing',{'processedTiles':summary['tiles_processed'],'totalTiles':math.ceil(grid['width']/512)*math.ceil(grid['height']/512)})
        receipt['resultDirectory']=str(out)
        receipt['runnerProcessingSeconds']=(__import__('datetime').datetime.fromisoformat(summary['completed_utc'])-__import__('datetime').datetime.fromisoformat(summary['started_utc'])).total_seconds()
        emit('packaging')
        from package_result import package
        receipt['result']=package(out,summary)
        receipt['status']='completed'
        emit('completed',{'candidatePixels':summary['candidate_pixels'],'validPixels':summary['valid_pixels']})
        return 0
    except PipelineError as error:
        receipt.update(status='failed',error={'code':error.code,'message':str(error)})
        emit('failed',receipt['error']); return 2
    except Exception as error:
        # Requests/SDK errors may contain signed URLs. Keep their text out of logs.
        import re
        safe_reason=re.sub(r'https?://\S+','[redacted URL]',str(error)) if type(error).__name__=='EEException' else None
        receipt.update(status='failed',error={'code':'LOCAL_PIPELINE_FAILED','message':'The local pipeline could not complete. Source files are retained; check configuration, source access or input contract.', 'exceptionType':type(error).__name__, 'sourceReason':safe_reason[:600] if safe_reason else None})
        emit('failed',receipt['error']);return 2
    finally:
        stop.set();thread.join(timeout=1)
        memory=process.memory_info()
        receipt.update(completedAt=now(),totalElapsedSeconds=time.perf_counter()-started,
            memory={'peakSampledRssBytes':max(samples,default=memory.rss),'nativePeakWorkingSetBytes':getattr(memory,'peak_wset',None),
                    'scope':'whole CLI process; native peak includes imports/load; sampled RSS may miss spikes'})
        save(work/'run-receipt.json',receipt)
        print(json.dumps({'receipt':str(work/'run-receipt.json'),'status':receipt['status']},ensure_ascii=True),flush=True)

def main():
    parser=argparse.ArgumentParser(description='XEDO local CPU SAR acquisition/inference; no web publication.')
    parser.add_argument('command',choices=['doctor','analyze'])
    parser.add_argument('--area');parser.add_argument('--metadata');parser.add_argument('--start');parser.add_argument('--end');parser.add_argument('--scene')
    parser.add_argument('--model',default=str(ROOT.parent.parent/'outputs/XEDO_SAR_2026-10-07/sar_v26_fresh_best_export.pth'))
    parser.add_argument('--output',default=str(ROOT/'output/local-ai'))
    parser.add_argument('--env-file',default=str(ROOT/'.env'))
    parser.add_argument('--threads',type=int,choices=[2,4],default=4)
    parser.add_argument('--online',action='store_true')
    args=parser.parse_args()
    os.environ.update(CUDA_VISIBLE_DEVICES='-1',OMP_NUM_THREADS=str(args.threads),MKL_NUM_THREADS=str(args.threads),OPENBLAS_NUM_THREADS=str(args.threads),GDAL_CACHEMAX='128',PYTHONDONTWRITEBYTECODE='1')
    if args.command=='doctor':
        modules={'torch':'torch','rasterio':'rasterio','numpy':'numpy','earthengine-api':'ee','shapely':'shapely','requests':'requests','psutil':'psutil'}
        report={'checkedAt':now(),'packages':{k:importlib.metadata.version(k) for k in modules},
                'modelHashMatches':Path(args.model).is_file() and digest(args.model)==MODEL_SHA256,
                'engineHashMatches':digest(Path(__file__).parent/'vendor/gee_sar_inference.py')==ENGINE_SHA256,
                'noBillingOrProvisioning':True,'hostedQueueOrStorageReady':False}
        if args.online:
            from acquisition import connect
            try:
                _,report['gee']=connect(args.env_file)
            except PipelineError as error:
                report['gee']={'ready':False,'code':error.code,'message':str(error)}
                print(json.dumps(report,ensure_ascii=True,indent=2));return 2
            except Exception:
                report['gee']={'ready':False,'code':'GEE_UNAVAILABLE','message':'The existing GEE connection could not complete its read-only check.'}
                print(json.dumps(report,ensure_ascii=True,indent=2));return 2
        print(json.dumps(report,ensure_ascii=True,indent=2));return 0 if report['modelHashMatches'] and report['engineHashMatches'] else 2
    if args.metadata and args.area:
        parser.error('Choose --area for new GEE acquisition OR --metadata for explicit replay, not both.')
    return run(args)

if __name__=='__main__':
    sys.exit(main())
