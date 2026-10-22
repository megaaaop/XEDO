import {mkdir, readFile, writeFile, rm, unlink} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (resolve(process.cwd()) !== root) throw new Error('Run the build from the project root.');
const output = resolve(root, 'dist');
if (dirname(output) !== root || output !== resolve(root, 'dist')) throw new Error('Unexpected output path.');
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
const page = resolve(output, 'index.html');
execFileSync(process.execPath, [resolve(root, 'scripts/build-planning-file.mjs'), page], {cwd: root, stdio: 'inherit'});
let html = await readFile(page, 'utf8');
html = html.replace('<title>XEDO · Local mission trial</title>', '<title>XEDO · Innovation draft</title>')
  .replace('>Local file mode</a>', '>Prototype mode</a>')
  .replace('>Local file · Method and limits</summary>', '>Prototype · Method and limits</summary>');
await writeFile(page, html);
await unlink(resolve(output, 'README.txt'));
console.log('Built the browser-only innovation draft: dist/index.html. No API or credentials are deployed.');
