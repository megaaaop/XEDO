import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {Script} from 'node:vm';
import {planningHelpTopics} from '../src/planning-help-content.js';

// A portable artifact: classic inline JS, inline CSS/images, and no API server.
const destination=resolve(process.argv[2]||'output/standalone/XEDO-Planning-Trial.html');
if(!destination.endsWith('.html'))throw new Error('Choose an .html output file.');
const previewData='data:image/png;base64,'+(await readFile('public/assets/sentinel-proof.png')).toString('base64');
const bundle=await build({
  define:{__XEDO_PREVIEW_DATA__:JSON.stringify(previewData),__XEDO_STANDALONE__:'true',__XEDO_GEE_HOSTED__:process.argv.includes('--gee-hosted')?'true':'false'},
  entryPoints:['src/planning-trial-client.js'],bundle:true,splitting:false,format:'iife',
  target:'es2022',minify:true,write:false,outdir:'output/standalone-build',
  loader:{'.png':'dataurl','.jpg':'dataurl','.svg':'dataurl'},
  plugins:[{name:'public-assets',setup(builder){
    builder.onResolve({filter:/^\/assets\//},args=>({path:resolve('public',args.path.slice(1))}));
  }}]
});
const script=bundle.outputFiles.find(file=>file.path.endsWith('.js'))?.text;
let css=bundle.outputFiles.find(file=>file.path.endsWith('.css'))?.text;
if(!script||!css)throw new Error('The portable JS or stylesheet is missing.');
css=css.replace(/@import[^;]+;/g,''); // Use system font fallbacks without fetching fonts.
const dataImage=async(path,type)=>'data:'+type+';base64,'+(await readFile(path)).toString('base64');
const logo=await dataImage('public/assets/xedo-brand-mangrove.png','image/png');
const favicon=await dataImage('public/favicon-xedo-planning.svg','image/svg+xml');
const escape=value=>value.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const method=await readFile('public/docs/planning-trial.md','utf8');
let html=await readFile('public/planning.html','utf8');
for(const token of ['href="/favicon-xedo-planning.svg"','src="/assets/xedo-brand-mangrove.png"','href="/" aria-label="XEDO Home"','<main class="trial-shell">','href="/docs/planning-trial.md" target="_blank" rel="noopener"','id="trial-info-dialog"']){
  if(!html.includes(token))throw new Error('Portable markup hook is missing: '+token);
}
for(const [,key] of html.matchAll(/data-help="([^"]+)"/g))if(!Object.hasOwn(planningHelpTopics,key))throw new Error('Unknown information topic: '+key);
html=html.replace(/<title>[^<]*<\/title>/,'<title>XEDO · Local mission trial</title>')
  .replace('<link rel="stylesheet" href="/trial.css">','')
  .replace('<script type="module" src="/trial.js"></script>','')
  .replace('href="/favicon-xedo-planning.svg"','href="'+favicon+'"')
  .replaceAll('src="/assets/xedo-brand-mangrove.png"','src="'+logo+'"')
  .replace('href="/" aria-label="XEDO Home"','href="#trial-top" aria-label="XEDO Coastal inspection"')
  .replace('href="/mission.html">Back to mission','href="#trial-top">Local file mode')
  .replace('<main class="trial-shell">','<main id="trial-top" class="trial-shell">')
  .replace('href="/docs/planning-trial.md" target="_blank" rel="noopener"','href="#standalone-method"')
  .replace('</head>',()=>'<style>'+css.replace(/<\/style/gi,'<\\/style')+'\n#standalone-method{margin-top:28px;padding:20px;border:1px solid var(--border);border-radius:8px}#standalone-method pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.7 var(--font);color:var(--muted)}#standalone-method summary{cursor:pointer}</style></head>');
const fileNote=process.argv.includes('--gee-hosted')
  ? 'The background map loads real Google Earth Engine Sentinel-2 imagery on opening, before an inspection area is drawn. It is a mosaic of up to 31 intersecting acquisitions from the recent 30-day UTC window, with newer images on top; its actual acquisition range is shown. Pan or zoom to update the bounded background. Draw an area over that imagery, then choose Review area image to load one dated, fully covering acquisition for review. The background alone does not mark a mission ready. Cloud cover describes the whole scene; imagery is not a continuous live feed or oil detection. Archived imagery is available only by explicit selection. Calculations and downloads run in the browser; saved survey IDs need the separate workspace database. Missing credentials and imagery failures remain visible.'
  : 'Standalone prototype: all four calculators, 2D/3D diagrams and downloads run in this file. No local server or port is used. The stored Sentinel-2 image and calculations work offline; the basemap needs internet. Follow Select an area, Satellite survey, then Drone deployment. The four calculations run in the background; Mission settings and Calculation details open on demand. Saved survey IDs cannot load from a database. Import a snapshot or GeoJSON instead. Imported database linkage is unverified; new results use the imported geometry as a local trial boundary. Manual export confirmations require fresh review.';
html=html.replace('</main>',()=>'<details id="standalone-method"><summary>Local file · Method and limits</summary><p class="trial-help">'+fileNote+'</p><pre>'+escape(method)+'</pre></details></main>');
html=html.replace('</body>',()=>'<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script><script>document.querySelector(\'a[href="#standalone-method"]\').addEventListener("click",()=>{document.getElementById("standalone-method").open=true;});</script></body>');
const inlineScripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if(inlineScripts.length!==2)throw new Error('The portable script boundaries are invalid.');
for(const [,inline] of inlineScripts)new Script(inline);
if(/(?:src|href)="\/(?:assets\/|favicon-)/.test(html))throw new Error('A portable artwork asset was not embedded.');
await mkdir(dirname(destination),{recursive:true});
await writeFile(destination,html);
await writeFile(resolve(dirname(destination),'README.txt'),'XEDO local planning trial\n\nDouble-click XEDO-Planning-Trial.html to open it in your browser.\nClick Load test example, then Review area image, review the image and choose Prepare drone mission.\n\n'+fileNote+'\n\nSource: scripts/build-planning-file.mjs\n');
console.log('Created portable local file: '+destination+' ('+Buffer.byteLength(html)+' bytes)');
