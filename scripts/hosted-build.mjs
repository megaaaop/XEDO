import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,dirname,basename,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {planningHelpTopics} from '../src/planning-help-content.js';

export const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const slash=value=>value.split(sep).join('/');

// Hosted calculations still run in-browser. Preserve import boundaries so
// 3D, COG decoders and the calculation engine need not load with the shell.
export async function buildHosted({output=resolve(projectRoot,'dist')}={}){
  output=resolve(output);
  const scratch=resolve(projectRoot,'output')+sep;
  if(output!==resolve(projectRoot,'dist')&&!output.startsWith(scratch))throw new Error('Unexpected hosted output path.');
  await rm(output,{recursive:true,force:true});
  const assets=resolve(output,'assets');await mkdir(assets,{recursive:true});
  const copied=[];
  async function artwork(source){
    const bytes=await readFile(resolve(projectRoot,source)),name=basename(source),dot=name.lastIndexOf('.');
    const file=name.slice(0,dot)+'-'+digest(bytes).slice(0,12)+name.slice(dot);
    await writeFile(resolve(assets,file),bytes);
    copied.push({source,url:'/assets/'+file,bytes:bytes.length,sha256:digest(bytes)});
    return '/assets/'+file;
  }
  const logo=await artwork('public/assets/xedo-brand-mangrove-web.png');
  const favicon=await artwork('public/favicon-xedo-planning.png');
  const preview=await artwork('public/assets/sentinel-proof.png');
  const result=await build({
    absWorkingDir:projectRoot,entryPoints:{planner:'src/planning-trial-client.js'},
    bundle:true,splitting:true,format:'esm',target:'es2022',minify:true,metafile:true,
    outdir:assets,entryNames:'[name]-[hash]',chunkNames:'[name]-[hash]',assetNames:'[name]-[hash]',
    define:{__XEDO_STANDALONE__:'true',__XEDO_GEE_HOSTED__:'true',__XEDO_PREVIEW_DATA__:JSON.stringify(preview)},
    loader:{'.png':'file','.jpg':'file','.svg':'file'},
    plugins:[{name:'public-assets',setup(builder){
      builder.onResolve({filter:/^\/assets\//},args=>({path:resolve(projectRoot,'public',args.path.slice(1))}));
    }}]
  });
  const outputs=new Map(Object.entries(result.metafile.outputs).map(([file,value])=>[resolve(projectRoot,file),value]));
  const entry=[...outputs].find(([,value])=>value.entryPoint==='src/planning-trial-client.js');
  if(!entry?.[1].cssBundle)throw new Error('Hosted entry or stylesheet is missing.');
  const url=file=>'/'+slash(relative(output,resolve(projectRoot,file)));
  const initial=new Set();
  function visit(file){
    file=resolve(projectRoot,file);if(initial.has(file))return;initial.add(file);
    const meta=outputs.get(file);if(!meta)throw new Error('Missing hosted module: '+relative(projectRoot,file));
    for(const dependency of meta.imports)if(!dependency.external&&dependency.kind==='import-statement')visit(dependency.path);
  }
  visit(entry[0]);
  const preload=[...initial].map(file=>`<link rel="modulepreload" href="${url(file)}">`).join('');
  let html=await readFile(resolve(projectRoot,'public/planning.html'),'utf8');
  for(const token of ['href="/favicon-xedo-planning.svg"','src="/assets/xedo-brand-mangrove.png"','<main class="trial-shell">','<script type="module" src="/trial.js"></script>'])if(!html.includes(token))throw new Error('Hosted markup hook is missing: '+token);
  for(const [,key]of html.matchAll(/data-help="([^"]+)"/g))if(!Object.hasOwn(planningHelpTopics,key))throw new Error('Unknown information topic: '+key);
  const startup='<div id="planner-startup" role="status" style="position:fixed;bottom:16px;right:16px;z-index:200;padding:12px 16px;background:#18252f;color:#e4eef5;border:1px solid #52616b;border-radius:8px;font:14px system-ui"><span>Loading planner…</span> <button type="button" hidden>Reload</button></div>';
  const boot=await readFile(resolve(projectRoot,'src/planner-boot.js'),'utf8');
  html=html.replace('<link rel="stylesheet" href="/trial.css">',`<link rel="stylesheet" href="${url(entry[1].cssBundle)}">${preload}`)
    .replace('<script type="module" src="/trial.js"></script>',`<script id="planner-boot" type="module" data-entry="${url(entry[0])}">${boot.replace(/<\/script/gi,'<\\/script')}</script>`)
    .replace('href="/favicon-xedo-planning.svg"',`type="image/png" href="${favicon}"`)
    .replaceAll('src="/assets/xedo-brand-mangrove.png"',`src="${logo}"`)
    .replace('href="/" aria-label="XEDO Home"','href="#trial-top" aria-label="XEDO Coastal inspection"')
    .replace('<header class="mission-header">','<header class="mission-header" data-planner-shell inert>')
    .replace('<main class="trial-shell">','<main id="trial-top" class="trial-shell" data-planner-shell inert>')
    .replace('</body>',startup+'</body>');
  if(/data:image\//.test(html)||html.includes('/trial.js')||html.includes('/trial.css'))throw new Error('Hosted page retained an inline image or unresolved entry.');
  await writeFile(resolve(output,'index.html'),html);
  const emitted=[];
  for(const [file,meta]of outputs){
    const bytes=await readFile(file);
    emitted.push({url:url(file),bytes:bytes.length,gzipBytes:gzipSync(bytes).length,sha256:digest(bytes),entryPoint:meta.entryPoint||null,initial:initial.has(file),imports:meta.imports.map(value=>({...value,path:value.external?value.path:url(value.path)}))});
  }
  return {
    output:slash(relative(projectRoot,output)),html:{bytes:Buffer.byteLength(html),gzipBytes:gzipSync(html).length,sha256:digest(html)},
    entry:url(entry[0]),stylesheet:url(entry[1].cssBundle),initialModules:[...initial].map(url),
    initialJsBytes:[...initial].reduce((sum,file)=>sum+outputs.get(file).bytes,0),copiedAssets:copied,emitted
  };
}
