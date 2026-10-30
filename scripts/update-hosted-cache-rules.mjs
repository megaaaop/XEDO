import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {buildHosted,projectRoot} from './hosted-build.mjs';
import {productionAssetCacheSource,hostedCacheControl} from './static-cache.mjs';

if(resolve(process.cwd())!==projectRoot)throw new Error('Run from the project root.');
const report=await buildHosted(),file=resolve(projectRoot,'vercel.json');
const config=JSON.parse(await readFile(file,'utf8'));
config.headers=config.headers.filter(rule=>!rule.source.startsWith('/assets/'));
config.headers.push({source:productionAssetCacheSource([...report.emitted,...report.copiedAssets].map(asset=>asset.url)),headers:[{key:'Cache-Control',value:hostedCacheControl(report.entry)}]});
await writeFile(file,JSON.stringify(config,null,2)+'\n');
console.log('Updated immutable cache rule for '+(report.emitted.length+report.copiedAssets.length)+' emitted assets. Missing asset URLs keep Vercel default revalidation.');
