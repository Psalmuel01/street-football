import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createPurchaseService,PurchaseError} from './purchases.mjs';
import {createStore} from './store.mjs';

const root=await realpath('dist');
const ancestors="'self' https://lagoslife.app https://www.lagoslife.app https://naijalife.app https://www.naijalife.app https://lagoslife.eliysites.com";
const secret=process.env.VATAR_SECRET,gameId=process.env.VATAR_GAME_ID,mode=process.env.VATAR_MODE||'test';
const database=process.env.DATABASE_URL||process.env.QUIKDB_CLOUD_DB_URL;
let service,store;
if(secret&&gameId&&database){
 if(!process.env.PUBLIC_ORIGIN)throw new Error('PUBLIC_ORIGIN is required for purchase service');
 if(!['test','live'].includes(mode)||!secret.startsWith(mode==='test'?'vtr_test_':'vtr_live_'))throw new Error('Vatar key/mode mismatch');
 store=await createStore(database);
 const api=async(route,body)=>{
  const response=await fetch('https://lagoslife.app/api/games/v1'+route,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!response.ok)throw new PurchaseError('platform_verification_failed',response.status>=500?503:response.status);
  return response.json();
 };
 service=createPurchaseService({api,store,gameId,mode});
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav','.glb':'model/gltf-binary','.woff2':'font/woff2'};
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const body=async req=>{
 const chunks=[];let bytes=0;
 for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)throw new PurchaseError('body_too_large',413);chunks.push(chunk);}
 try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw new PurchaseError('invalid_json');}
};
const limits=new Map();
const server=http.createServer(async(req,res)=>{
 res.setHeader('Content-Security-Policy',`frame-ancestors ${ancestors}`);
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 try{
  const url=new URL(req.url,'http://local');
  if(url.pathname==='/health'){json(res,200,{ok:true,purchasesConfigured:!!service});return;}
  if(url.pathname.startsWith('/api/')){
   if(!['/api/claim','/api/entitlements'].includes(url.pathname)){json(res,404,{error:'not_found'});return;}
   if(req.method!=='POST'){json(res,405,{error:'method_not_allowed'});return;}
   // The SDK is cross-origin; our game-to-server calls are same-origin and need no CORS.
   if(req.headers.origin&&req.headers.origin!==process.env.PUBLIC_ORIGIN){json(res,403,{error:'wrong_origin'});return;}
   if(!String(req.headers['content-type']).startsWith('application/json')){json(res,415,{error:'json_required'});return;}
   if(!service){json(res,503,{error:'purchases_unavailable'});return;}
   const key=req.socket.remoteAddress||'local',now=Date.now();
   let bucket=limits.get(key);if(!bucket||now-bucket.at>=60000){bucket={at:now,count:0};limits.set(key,bucket);}
   if(++bucket.count>60){json(res,429,{error:'rate_limited'});return;}
   if(limits.size>10000)for(const [k,v] of limits)if(now-v.at>60000)limits.delete(k);
   const data=await body(req);
   if(!data||typeof data!=='object'||Array.isArray(data))throw new PurchaseError('invalid_json');
   json(res,200,await service[url.pathname==='/api/claim'?'claim':'entitlements'](data));return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let decoded;
  try{decoded=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
  if(decoded.includes('\0')||decoded.split('/').some(part=>part.startsWith('.'))){res.writeHead(404);res.end();return;}
  let filename=path.resolve(root,'.'+decoded),info;
  if(!filename.startsWith(root+path.sep)&&filename!==root){res.writeHead(404);res.end();return;}
  try{info=await stat(filename);if(info.isDirectory())filename=path.join(filename,'index.html');info=await stat(filename);}
  catch{if(path.extname(decoded)){res.writeHead(404);res.end();return;}filename=path.join(root,'index.html');info=await stat(filename);}
  filename=await realpath(filename);
  if(!filename.startsWith(root+path.sep)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',types[path.extname(filename)]||'application/octet-stream');
  res.setHeader('Cache-Control',filename.endsWith('index.html')||filename.endsWith('sw.js')?'no-cache':'public, max-age=3600');
  res.setHeader('Accept-Ranges','bytes');
  let start=0,end=info.size-1,status=200;
  if(req.headers.range){
   const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   if(!range||(!range[1]&&!range[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
   start=range[1]?Number(range[1]):Math.max(0,info.size-Number(range[2]));end=range[1]&&range[2]?Math.min(Number(range[2]),end):end;
   if(start> end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
   status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);
  }
  res.setHeader('Content-Length',Math.max(0,end-start+1));res.writeHead(status);
  if(req.method==='HEAD'||info.size===0){res.end();return;}
  const stream=createReadStream(filename,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
 }catch(error){if(!res.headersSent)json(res,error instanceof PurchaseError?error.status:503,{error:error instanceof PurchaseError?error.code:'service_unavailable'});else res.destroy();}
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT||5173),'0.0.0.0',()=>console.log(`Game server listening; purchases ${service?'configured':'disabled'}.`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{await store?.close();process.exit(0);}));
