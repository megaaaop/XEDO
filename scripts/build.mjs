import {resolve} from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {buildHosted,projectRoot} from './hosted-build.mjs';
import {productionAssetCacheSource,hostedCacheControl} from './static-cache.mjs';

if(resolve(process.cwd())!==projectRoot)throw new Error('Run the build from the project root.');
const report=await buildHosted();
const config=JSON.parse(await readFile(resolve(projectRoot,'vercel.json'),'utf8'));
const assetRules=config.headers?.filter(rule=>rule.source.startsWith('/assets/'))||[];
if(assetRules.length!==1||assetRules[0].source!==productionAssetCacheSource([...report.emitted,...report.copiedAssets].map(file=>file.url))||assetRules[0].headers?.find(header=>header.key.toLowerCase()==='cache-control')?.value!==hostedCacheControl(report.entry))throw new Error('Hosted cache inventory is stale. Run node scripts/update-hosted-cache-rules.mjs and commit vercel.json before deploying.');
await mkdir(resolve(projectRoot,'output'),{recursive:true});
await writeFile(resolve(projectRoot,'output/hosted-build-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Built hosted planner: ${report.html.bytes} byte HTML, ${report.initialJsBytes} byte initial JS; deferred modules and artwork are versioned files in dist/assets/.`);
console.log('Portable file remains available through npm run build:file. Credentials stay in server runtime configuration.');
