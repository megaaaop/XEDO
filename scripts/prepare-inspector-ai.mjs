import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source=new URL('../db/prepared-sar.json',import.meta.url),text=await readFile(source,'utf8'),data=JSON.parse(text);
if(data.resultId!=='XEDO_SAR_20261011T130518Z_6152a5'||data.candidates.features.length!==14||/C:\\|\/Users\/|drive\.google\.com/i.test(text)||text.includes('$xedo_catalog$'))throw Error('The fixed prepared SAR package is invalid.');
const sql="-- Immutable historical SAR reference. No user records or credentials.\ninsert into xedo_private.prepared_analysis_catalog(result_id,payload) values ('"+data.resultId+"',$xedo_catalog$"+text+"$xedo_catalog$::jsonb);\n";
await writeFile(new URL('../db/inspector-ai-seed.sql',import.meta.url),sql);
console.log(JSON.stringify({resultId:data.resultId,candidates:data.candidates.features.length,sha256:createHash('sha256').update(text).digest('hex')}));
