import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {buildHosted,projectRoot} from './hosted-build.mjs';

if(resolve(process.cwd())!==projectRoot)throw new Error('Run the build from the project root.');
const report=await buildHosted();
await mkdir(resolve(projectRoot,'output'),{recursive:true});
await writeFile(resolve(projectRoot,'output/hosted-build-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Built hosted planner: ${report.html.bytes} byte HTML, ${report.initialJsBytes} byte initial JS; deferred modules and artwork are versioned files in dist/assets/.`);
console.log('Portable file remains available through npm run build:file. Credentials stay in server runtime configuration.');
