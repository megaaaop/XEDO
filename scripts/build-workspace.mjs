import {build} from 'esbuild';
import {mkdir, cp, rm, readFile, writeFile} from 'node:fs/promises';
import {resolve, basename, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (resolve(process.cwd()) !== root) throw new Error('Run the workspace build from the project root.');
const target = resolve(root, 'dist-workspace');
if (dirname(target) !== root || target !== resolve(root, 'dist-workspace')) throw new Error('Unexpected build path.');
await rm(target, {recursive: true, force: true});
await mkdir(resolve(target, 'client'), {recursive: true});
await cp('public', resolve(target, 'client'), {recursive: true});
const client = await build({entryPoints: {app:'src/client.js', mission:'src/mission-client.js', trial:'src/planning-trial-client.js'}, bundle:true, splitting:true, format:'esm', target:'es2022', outdir:resolve(target, 'client'), entryNames:'[name]-[hash]', chunkNames:'chunks/[name]-[hash]', minify:true, external:['/assets/*'], define:{__XEDO_STANDALONE__:'false'}, metafile:true});
for (const [entry, file, name] of [['src/client.js','dashboard.html','app'],['src/mission-client.js','mission.html','mission'],['src/planning-trial-client.js','planning.html','trial']]) {
  const app = Object.entries(client.metafile.outputs).find(([,value]) => value.entryPoint === entry && value.cssBundle);
  if (!app) throw new Error('Client entry point or stylesheet is missing: ' + entry);
  const path = resolve(target, 'client', file);
  const html = await readFile(path, 'utf8');
  await writeFile(path, html.replace('/'+name+'.js', '/'+basename(app[0])).replace('/'+name+'.css', '/'+basename(app[1].cssBundle)));
}
await cp(resolve(target,'client/planning.html'),resolve(target,'client/index.html'));
await build({entryPoints:['src/worker.js'], bundle:true, format:'esm', target:'es2022', outfile:resolve(target, 'server/index.js'), minify:true});
await cp('drizzle', resolve(target, 'migrations'), {recursive:true});
console.log('Built optional full workspace in dist-workspace/. Hosting/auth/storage integration is separate.');
