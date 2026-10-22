import {mkdir,writeFile} from 'node:fs/promises';
process.stdin.setRawMode?.(true);
console.log('Ready for backup input (hidden).');
try{
  const config=await new Promise((resolve,reject)=>{let value='';const timer=setTimeout(()=>reject(new Error('Input timeout')),20000);process.stdin.on('data',c=>{value+=c.toString();try{const data=JSON.parse(value.trim());clearTimeout(timer);process.stdin.pause();resolve(data);}catch{}});});
  if(config.url!=='https://xedo-ocean-mission.megaroblox350.chatgpt.site')throw new Error('Wrong destination');
  const r=await fetch(config.url+'/api/backup',{headers:{'OAI-Sites-Authorization':'Bearer '+config.token},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error('Backup API unavailable');const bytes=new Uint8Array(await r.arrayBuffer()),data=JSON.parse(new TextDecoder().decode(bytes));
  await mkdir('output',{recursive:true});await writeFile('output/production-backup-before-v05.json',bytes);console.log(JSON.stringify({backup:true,records:data.records.length,files:data.files.length,bytes:bytes.length}));process.exit(0);
}catch{console.log(JSON.stringify({backup:false,reason:'API or input unavailable; credentials not logged'}));process.exit(1);}
