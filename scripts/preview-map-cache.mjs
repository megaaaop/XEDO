import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {saveCacheKey,readCacheKey} from './map-cache-secrets.mjs';

const port=5198,origin=`http://127.0.0.1:${port}`,nonce=randomBytes(24).toString('hex');
const filename=resolve('data/gee-cache-server.dpapi'),url='https://tstmjnlhwidwtzetqxbu.supabase.co';
let connected=false;try{connected=!!(await readCacheKey(filename));}catch{}
const html=`<!doctype html><html lang="th"><meta charset="utf-8"><title>XEDO Cache — Server setup</title><style>body{font:18px system-ui;background:#14212a;color:#eef5fa;max-width:760px;margin:60px auto;padding:24px}input,button{font:inherit;padding:15px;box-sizing:border-box;width:100%;margin:12px 0}a{color:#8cdddd}#status{white-space:pre-wrap}</style><h1>เชื่อมคีย์แคชในเครื่อง</h1><p>ใช้คีย์ฝั่งเซิร์ฟเวอร์ของ Supabase โปรเจกต์ xedo เพื่อทดสอบเก็บภาพแผนที่ ไม่ต้องส่งคีย์เข้าแชท</p><p>เปิด Supabase → Project Settings → API Keys → Legacy API Keys → service_role แล้วคัดลอกคีย์เดิมมาใส่ที่นี่ (หรือใช้ secret key ที่มีอยู่แล้ว) ไม่ใช้ anon/publishable key ไม่ต้องเปิด Billing หรือเปลี่ยนแผน</p><p>คีย์จะเก็บเข้ารหัสสำหรับบัญชี Windows นี้ในโฟลเดอร์ data ที่ไม่เข้า Git หรือไฟล์เว็บ</p><form id="form"><label>Server key ของ xedo<input id="key" type="password" autocomplete="off" required></label><button>เชื่อมคีย์</button></form><p id="status">${connected?'มีคีย์ในเครื่องแล้ว':'ยังไม่มีคีย์ในเครื่อง'}</p><script>form.onsubmit=async e=>{e.preventDefault();const b=form.querySelector('button');b.disabled=true;statusText('กำลังตรวจคีย์…');try{const r=await fetch('/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nonce:'${nonce}',key:document.querySelector('#key').value})});const v=await r.json();document.querySelector('#key').value='';statusText(v.ok?'เชื่อมแล้ว — เก็บคีย์เข้ารหัสในเครื่องเรียบร้อย':v.message);}catch{statusText('เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง')}finally{b.disabled=false}};function statusText(t){document.querySelector('#status').textContent=t}</script></html>`;
http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  const reply=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  if(req.headers.host!==`127.0.0.1:${port}`)return reply({ok:false},403);
  if(req.method==='GET'&&req.url==='/setup'){res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});return res.end(html);}
  if(req.method==='GET'&&req.url==='/status')return reply({connected});
  if(req.method!=='POST'||req.url!=='/setup'||req.headers.origin!==origin)return reply({ok:false},403);
  let step='input';try{
    let raw='';for await(const b of req){raw+=b;if(Buffer.byteLength(raw)>16384)throw new Error();}
    const input=JSON.parse(raw),key=input.key?.trim();
    if(input.nonce!==nonce||typeof key!=='string'||key.length>8192)throw new Error();
    let isServer=key.startsWith('sb_secret_');try{isServer ||= JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='service_role';}catch{}
    if(!isServer)return reply({ok:false,message:'กรุณาใช้ service_role หรือ secret key ของโปรเจกต์ xedo ไม่ใช่ anon/publishable key'},422);
    step='network';const check=await fetch(url+'/storage/v1/bucket',{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(20000)});
    if(!check.ok)return reply({ok:false,message:'คีย์ยังเข้าโปรเจกต์ xedo ไม่ได้ กรุณาตรวจว่าเป็นคีย์ของโปรเจกต์นี้'},422);
    step='encrypt';await saveCacheKey(filename,key);connected=true;return reply({ok:true});
  }catch{return reply({ok:false,message:step==='encrypt'?'ตรวจคีย์แล้ว แต่ตัวเก็บคีย์เข้ารหัสยังไม่พร้อม กรุณาแจ้งแชทหลัก':step==='network'?'ติดต่อ Supabase ไม่สำเร็จ คีย์ยังไม่ถูกบันทึก กรุณาลองใหม่':'ข้อมูลหน้าเชื่อมต่อหมดอายุ กรุณารีเฟรชหน้านี้แล้วกรอกใหม่'},422);}
}).listen(port,'127.0.0.1',()=>console.log(`XEDO cache setup: ${origin}/setup (key is never logged)`));
