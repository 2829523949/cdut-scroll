import { questions, calculate, isAnswered, activeCount, answerLabel } from '../model.js';
import { buildInsights } from '../insights.js';
import adminHTML from './ui/admin.html';
import adminJS from './ui/admin.js';
import adminCSS from './ui/admin.css';

export const VERSION = 'wjx-20261023';
export const PRIVACY = '2026-10-23-v1';
const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();
class HTTPError extends Error { constructor(status, message) { super(message); this.status = status; } }
const json = (data, status=200, extra={}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type':'application/json; charset=utf-8', ...extra } });
const hex = buffer => [...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('');
const digest = text => crypto.subtle.digest('SHA-256',encoder.encode(text)).then(hex);
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
async function sameSecret(a,b) {
  const [one,two] = await Promise.all([digest(a),digest(b)]);
  let diff=0; for(let i=0;i<one.length;i++) diff |= one.charCodeAt(i)^two.charCodeAt(i);
  return diff===0;
}
async function readJSON(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HTTPError(415,'请使用正确的提交格式。');
  const reader=request.body?.getReader(); if(!reader) throw new HTTPError(400,'提交内容为空。');
  const chunks=[]; let size=0;
  try { while(true) { const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>16384) { await reader.cancel(); throw new HTTPError(413,'提交内容过大。'); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  const bytes=new Uint8Array(size); let position=0;
  for(const chunk of chunks) { bytes.set(chunk,position); position+=chunk.length; }
  try { const result=JSON.parse(new TextDecoder().decode(bytes)); if(!result || typeof result!=='object' || Array.isArray(result)) throw 0; return result; }
  catch { throw new HTTPError(400,'提交内容无法识别，请重新提交。'); }
}
async function rateLimit(env, request, name, max) {
  const slot=Math.floor(Date.now()/900000);
  const ip=request.headers.get('CF-Connecting-IP') || 'unknown';
  const bucket=await digest(`${env.RATE_SECRET}:${name}:${slot}:${ip}`);
  const result=await env.DB.prepare('INSERT INTO rate_limits(bucket,hits,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 RETURNING hits').bind(bucket,(slot+1)*900).first();
  if(result.hits>max) throw new HTTPError(429,'操作较频繁，请过 15 分钟再试。');
}
function sameOrigin(request) {
  const origin=request.headers.get('Origin');
  if(origin && origin!==new URL(request.url).origin) throw new HTTPError(403,'请从管理页面操作。');
}
async function session(request,env) {
  const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)__Host-cdut_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(!token) throw new HTTPError(401,'请先登录。');
  const tokenHash=await digest(token);
  const found=await env.DB.prepare('SELECT token_hash FROM sessions WHERE token_hash=? AND expires>?').bind(tokenHash,Math.floor(Date.now()/1000)).first();
  if(!found) throw new HTTPError(401,'登录已过期，请重新登录。');
  return tokenHash;
}
const cookie=(token,maxAge)=>`__Host-cdut_session=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
function filters(url) {
  const clauses=[], values=[];
  const code=url.searchParams.get('code');
  if(code) { if(!/^(?:[SD][IE][WM][QV]|ZEN)$/.test(code)) throw new HTTPError(400,'画像类型无效。'); clauses.push('code=?'); values.push(code); }
  for(const key of ['from','to']) {
    const day=url.searchParams.get(key);
    if(day) {
      if(!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) throw new HTTPError(400,'日期格式无效。');
      // Filters use the dates displayed in China Standard Time.
      const timestamp=new Date(Date.parse(day+'T00:00:00+08:00')+(key==='to'?86400000:0)).toISOString();
      clauses.push(`created_at${key==='from'?'>=':'<'}?`); values.push(timestamp);
    }
  }
  if(url.searchParams.get('from') && url.searchParams.get('to') && url.searchParams.get('from')>url.searchParams.get('to')) throw new HTTPError(400,'开始日期不能晚于结束日期。');
  return { where:clauses.length?'WHERE '+clauses.join(' AND '):'', clauses, values };
}
function publicRecord(row) {
  return { id:row.id,createdAt:row.created_at,updatedAt:row.updated_at,version:row.version,answers:JSON.parse(row.answers),code:row.code,name:row.name,dimensions:JSON.parse(row.dimensions) };
}
function csvValue(value) {
  let text=String(value??'');
  if(/^[=+@\-\t\r]/.test(text)) text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
function csvLine(values) { return values.map(csvValue).join(',')+'\r\n'; }
async function dispatch(request,env) {
  const url=new URL(request.url), path=url.pathname;
  if(path==='/api/health' && request.method==='GET') {
    await env.DB.prepare('SELECT 1 AS ready').first();
    return json({ready:true,version:VERSION,privacyVersion:PRIVACY});
  }
  if(path==='/api/responses' && request.method==='POST') {
    const origin=request.headers.get('Origin');
    const allowed=(env.ALLOWED_ORIGINS||'https://2829523949.github.io').split(',');
    if(!origin || !allowed.includes(origin)) throw new HTTPError(403,'请从测试页面提交。');
    await rateLimit(env,request,'submit',30);
    const data=await readJSON(request);
    if(data.consent!==true || data.privacyVersion!==PRIVACY) throw new HTTPError(400,'请先阅读并同意答卷保存说明。');
    if(data.version!==VERSION) throw new HTTPError(409,'题目已更新，请刷新测试页面后重试。');
    if(!/^[a-f0-9-]{36}$/.test(data.id||'') || !/^[a-f0-9]{64}$/.test(data.editToken||'')) throw new HTTPError(400,'本次答卷标识无效，请重新开始测试。');
    if(!Number.isSafeInteger(data.revision) || data.revision<0 || data.revision>100000) throw new HTTPError(400,'答卷版本无效。');
    const answers=data.answers;
    if(!Array.isArray(answers) || answers.length!==questions.length || !answers.every((answer,index)=>answer===null || isAnswered(answer,index))) throw new HTTPError(400,'答案格式无效，请检查后重新提交。');
    let result; try { result=calculate(answers); } catch { throw new HTTPError(400,'请完成所有需要作答的题目。'); }
    const clean=answers.map((answer,index)=>index<activeCount(answers)?answer:null);
    const dimensions=buildInsights(clean).dimensions.map(({title,status,leftPercent})=>({title,status,leftPercent}));
    const now=new Date().toISOString(), editHash=await digest(data.editToken);
    const record=await env.DB.prepare(`INSERT INTO responses(id,created_at,updated_at,version,answers,code,name,dimensions,edit_hash,privacy_version,revision) VALUES(?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at,answers=excluded.answers,code=excluded.code,name=excluded.name,dimensions=excluded.dimensions,revision=excluded.revision
      WHERE responses.edit_hash=excluded.edit_hash AND excluded.revision>=responses.revision RETURNING id,revision`).bind(data.id,now,now,VERSION,JSON.stringify(clean),result.code,result.name,JSON.stringify(dimensions),editHash,PRIVACY,data.revision).first();
    if(!record) {
      const existing=await env.DB.prepare('SELECT edit_hash,revision FROM responses WHERE id=?').bind(data.id).first();
      if(existing?.edit_hash===editHash && existing.revision>data.revision) return json({saved:true,id:data.id,revision:existing.revision});
      throw new HTTPError(409,'答卷标识冲突，请重新开始测试。');
    }
    return json({saved:true,id:record.id,revision:record.revision},201);
  }
  if(path==='/api/admin/login' && request.method==='POST') {
    sameOrigin(request); await rateLimit(env,request,'login',6);
    const data=await readJSON(request);
    if(typeof data.password!=='string' || data.password.length>256 || !await sameSecret(data.password,env.ADMIN_PASSWORD)) throw new HTTPError(401,'管理密码不正确。');
    const token=randomToken();
    await env.DB.prepare('INSERT INTO sessions(token_hash,expires) VALUES(?,?)').bind(await digest(token),Math.floor(Date.now()/1000)+SESSION_SECONDS).run();
    return json({loggedIn:true},200,{'Set-Cookie':cookie(token,SESSION_SECONDS)});
  }
  if(path.startsWith('/api/admin/')) {
    sameOrigin(request); const tokenHash=await session(request,env);
    if(path==='/api/admin/session' && request.method==='GET') return json({loggedIn:true});
    if(path==='/api/admin/logout' && request.method==='POST') {
      await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(tokenHash).run();
      return json({loggedIn:false},200,{'Set-Cookie':cookie('',0)});
    }
    const {where,values,clauses}=filters(url);
    if(path==='/api/admin/responses' && request.method==='GET') {
      const page=Number(url.searchParams.get('page')||1);
      if(!Number.isInteger(page) || page<1 || page>100000) throw new HTTPError(400,'页码无效。');
      const [count,rows]=await env.DB.batch([
        env.DB.prepare(`SELECT COUNT(*) AS total FROM responses ${where}`).bind(...values),
        env.DB.prepare(`SELECT id,created_at,updated_at,version,answers,code,name,dimensions FROM responses ${where} ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET ?`).bind(...values,(page-1)*50)
      ]);
      return json({page,pageSize:50,total:count.results[0].total,rows:rows.results.map(publicRecord)});
    }
    if(path==='/api/admin/stats' && request.method==='GET') {
      const dayStart=new Date(Date.now()+8*3600000).toISOString().slice(0,10)+'T00:00:00+08:00';
      const extraWhere=where?where+' AND ':'WHERE ';
      const statements=[
        env.DB.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN created_at>=? THEN 1 ELSE 0 END) AS today,SUM(CASE WHEN code='ZEN' THEN 1 ELSE 0 END) AS skipped FROM responses ${where}`).bind(new Date(dayStart).toISOString(),...values),
        env.DB.prepare(`SELECT code,name,COUNT(*) AS count FROM responses ${where} GROUP BY code,name ORDER BY count DESC,code`).bind(...values),
        ...questions.map((_,index)=>env.DB.prepare(`SELECT CAST(j.value AS INTEGER) AS choice,COUNT(*) AS count FROM responses,json_each(CASE WHEN json_type(answers,'$[${index}]')='array' THEN json_extract(answers,'$[${index}]') ELSE json_array(json_extract(answers,'$[${index}]')) END) j ${extraWhere} j.value IS NOT NULL GROUP BY j.value ORDER BY choice`).bind(...values))
      ];
      const results=await env.DB.batch(statements);
      return json({summary:results[0].results[0],types:results[1].results,questions:questions.map(([title,options,meta],index)=>({number:index+1,title,options,type:meta.type,counts:options.map((_,choice)=>results[index+2].results.find(item=>item.choice===choice)?.count||0)}))});
    }
    if(path==='/api/admin/export' && request.method==='GET') {
      const snapshot=new Date().toISOString(); let last=null, finished=false, header=true;
      const stream=new ReadableStream({async pull(controller) {
        try {
          if(header) { header=false; controller.enqueue(encoder.encode('\uFEFF'+csvLine(['答卷编号','提交时间（北京时间）','更新时间（北京时间）','人格代号','人格名称',...['观看节奏','内容动机','表达关注','互动方式'].map(label=>label+'（左侧倾向%）'),...questions.map(([title],index)=>`${index+1}. ${title}`)]))); return; }
          if(finished) { controller.close(); return; }
          const cursor=last?' AND (created_at<? OR (created_at=? AND id<?))':'';
          const sql=`SELECT id,created_at,updated_at,version,answers,code,name,dimensions FROM responses WHERE ${[...clauses,'created_at<=?'].join(' AND ')}${cursor} ORDER BY created_at DESC,id DESC LIMIT 500`;
          const rows=(await env.DB.prepare(sql).bind(...values,snapshot,...(last?[last.created_at,last.created_at,last.id]:[])).all()).results;
          const time=value=>new Date(Date.parse(value)+8*3600000).toISOString().slice(0,19).replace('T',' ');
          const text=rows.map(row=>{const answers=JSON.parse(row.answers),dims=JSON.parse(row.dimensions); return csvLine([row.id,time(row.created_at),time(row.updated_at),row.code,row.name,...dims.map(d=>d.leftPercent??'未判断'),...questions.map((_,i)=>answers[i]===null?'已跳过':answerLabel(answers,i))]);}).join('');
          if(text) controller.enqueue(encoder.encode(text));
          last=rows.at(-1); finished=rows.length<500;
          if(!rows.length) controller.close();
        } catch(error) { controller.error(error); }
      }});
      return new Response(stream,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="cdut-results-${snapshot.slice(0,10)}.csv"`}});
    }
    throw new HTTPError(404,'未找到这项操作。');
  }
  if(request.method==='GET' && ['/','/admin','/admin/','/admin.html'].includes(path)) return new Response(adminHTML,{headers:{'Content-Type':'text/html; charset=utf-8'}});
  if(request.method==='GET' && path==='/admin.js') return new Response(adminJS,{headers:{'Content-Type':'text/javascript; charset=utf-8'}});
  if(request.method==='GET' && path==='/admin.css') return new Response(adminCSS,{headers:{'Content-Type':'text/css; charset=utf-8'}});
  throw new HTTPError(404,'页面不存在。');
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url), origin=request.headers.get('Origin');
    const allowed=(env.ALLOWED_ORIGINS||'https://2829523949.github.io').split(',').includes(origin);
    let response;
    try {
      if(request.method==='OPTIONS' && url.pathname==='/api/responses') {
        response=allowed?new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}}):json({error:'来源不允许。'},403);
      } else {
        if(!env.DB || !env.ADMIN_PASSWORD || !env.RATE_SECRET) throw new HTTPError(503,'暂时无法使用，请稍后再试。');
        response=await dispatch(request,env);
      }
    } catch(error) { response=json({error:error instanceof HTTPError?error.message:'操作未完成，请稍后再试。'},error instanceof HTTPError?error.status:500); }
    const headers=new Headers(response.headers);
    headers.set('Cache-Control','no-store'); headers.set('X-Content-Type-Options','nosniff'); headers.set('Referrer-Policy','no-referrer'); headers.set('X-Frame-Options','DENY');
    headers.set('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    if(url.pathname==='/api/responses' && allowed) { headers.set('Access-Control-Allow-Origin',origin); headers.set('Vary','Origin'); }
    return new Response(response.body,{status:response.status,headers});
  },
  async scheduled(_,env) {
    const now=Math.floor(Date.now()/1000);
    await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(now),env.DB.prepare('DELETE FROM rate_limits WHERE expires<?').bind(now)]);
  }
};
