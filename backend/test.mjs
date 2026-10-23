import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker, { VERSION, PRIVACY } from './dist/worker.mjs';

function environment() {
  const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
  function prepare(sql,values=[]){return {
    bind(...args){return prepare(sql,args);},
    async first(){return sqlite.prepare(sql).get(...values)||null;},
    async all(){return {results:sqlite.prepare(sql).all(...values)};},
    async run(){return {meta:sqlite.prepare(sql).run(...values)};}
  };}
  const DB={prepare,async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.all());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
  return {DB,sqlite,ADMIN_PASSWORD:'test-only-admin-password-not-deployed',RATE_SECRET:'test-only-rate-secret',ALLOWED_ORIGINS:'https://2829523949.github.io'};
}
const full=[0,0,0,0,0,[0,1],0,[1,3],[0,1,5],0,4,3,0,0,0,[0,3]];
const origin='https://results.example.test';
const request=(path,options={})=>new Request(origin+path,options);
function payload(overrides={}){return {id:crypto.randomUUID(),editToken:'a'.repeat(64),revision:1,version:VERSION,privacyVersion:PRIVACY,consent:true,answers:structuredClone(full),...overrides};}
function post(path,data,extra={}){return request(path,{method:'POST',headers:{'Content-Type':'application/json',Origin:path==='/api/responses'?'https://2829523949.github.io':origin,...extra},body:JSON.stringify(data)});}
async function login(env){const response=await worker.fetch(post('/api/admin/login',{password:env.ADMIN_PASSWORD}),env);assert.equal(response.status,200);return response.headers.get('Set-Cookie').split(';')[0];}

test('private data requires a revocable HttpOnly session; only permitted origins can submit',async()=>{
 const env=environment();
 for(const path of ['/api/admin/stats','/api/admin/responses','/api/admin/export'])assert.equal((await worker.fetch(request(path),env)).status,401);
 assert.equal((await worker.fetch(post('/api/responses',payload(),{Origin:'https://untrusted.example'}),env)).status,403);
 const preflight=await worker.fetch(request('/api/responses',{method:'OPTIONS',headers:{Origin:'https://2829523949.github.io'}}),env);
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://2829523949.github.io');
 assert.equal((await worker.fetch(post('/api/admin/login',{password:'wrong'}),env)).status,401);
 const success=await worker.fetch(post('/api/admin/login',{password:env.ADMIN_PASSWORD}),env);
 const cookie=success.headers.get('Set-Cookie');
 for(const part of ['HttpOnly','Secure','SameSite=Strict','__Host-cdut_session='])assert.ok(cookie.includes(part));
 const token=cookie.split(';')[0];
 assert.equal((await worker.fetch(request('/api/admin/session',{headers:{Cookie:token}}),env)).status,200);
 assert.equal((await worker.fetch(request('/api/admin/stats',{headers:{Cookie:token,Origin:'https://untrusted.example'}}),env)).status,403);
 assert.equal((await worker.fetch(request('/api/admin/logout',{method:'POST',headers:{Cookie:token,Origin:origin}}),env)).status,200);
 assert.equal((await worker.fetch(request('/api/admin/session',{headers:{Cookie:token}}),env)).status,401);
});
test('validates consent, version, multi-select limits, size and completeness',async()=>{
 const env=environment();
 for(const [data,status] of [[payload({consent:false}),400],[payload({version:'old'}),409],[payload({answers:Array(16).fill(null)}),400],[payload({id:'invalid'}),400]])assert.equal((await worker.fetch(post('/api/responses',data),env)).status,status);
 const invalid=structuredClone(full);invalid[8]=[0,1,2,3];
 assert.equal((await worker.fetch(post('/api/responses',payload({answers:invalid})),env)).status,400);
 assert.equal((await worker.fetch(post('/api/responses',payload({padding:'x'.repeat(20000)})),env)).status,413);
});
test('idempotent saves recompute results, reject takeover, ignore stale revisions, normalize skipped answers and export filtered data',async()=>{
 const env=environment(),data=payload(),auth=await login(env);
 const admin=path=>worker.fetch(request(path,{headers:{Cookie:auth}}),env);
 const first=await worker.fetch(post('/api/responses',{...data,code:'FORGED',name:'forged'}),env);
 assert.equal(first.status,201);assert.equal(first.headers.get('Access-Control-Allow-Origin'),'https://2829523949.github.io');
 assert.equal(first.headers.get('Cache-Control'),'no-store');
 assert.equal((await worker.fetch(post('/api/responses',data),env)).status,201);
 assert.equal((await worker.fetch(post('/api/responses',{...data,editToken:'b'.repeat(64)}),env)).status,409);
 const changed=structuredClone(full);changed[12]=3;
 assert.equal((await worker.fetch(post('/api/responses',{...data,answers:changed,revision:2}),env)).status,201);
 assert.equal((await worker.fetch(post('/api/responses',data),env)).status,200);
 let list=await (await admin('/api/admin/responses')).json();
 assert.equal(list.total,1);assert.equal(list.rows[0].answers[12],3);assert.notEqual(list.rows[0].code,'FORGED');assert.ok(!('edit_hash' in list.rows[0]));
 const skip=structuredClone(full);skip[3]=4;
 assert.equal((await worker.fetch(post('/api/responses',payload({answers:skip})),env)).status,201);
 list=await (await admin('/api/admin/responses?code=ZEN')).json();assert.equal(list.total,1);assert.ok(list.rows[0].answers.slice(4).every(value=>value===null));
 assert.ok(list.rows[0].dimensions.every(d=>d.leftPercent===null));
 const stats=await (await admin('/api/admin/stats')).json();
 assert.equal(stats.summary.total,2);assert.equal(stats.summary.skipped,1);assert.equal(stats.questions.length,16);
 assert.equal(stats.questions[0].counts[0],2);assert.equal(stats.questions[5].counts[0],1);assert.equal(stats.questions[8].counts[5],1);assert.equal(stats.questions[12].counts[3],1);
 assert.equal((await admin('/api/admin/responses?code=invalid')).status,400);
 assert.equal((await admin('/api/admin/stats?from=2026-10-25&to=2026-10-23')).status,400);
 const csv=await admin('/api/admin/export?code=ZEN');assert.equal(csv.status,200);
 const raw=new Uint8Array(await csv.arrayBuffer());assert.deepEqual([...raw.slice(0,3)],[239,187,191]);
 const text=new TextDecoder().decode(raw);assert.ok(text.includes('已跳过'));assert.ok(text.includes('佛系观察员'));assert.equal(text.split('\r\n').filter(Boolean).length,2);
 const expired=Math.floor(Date.now()/1000)-1;
 await env.DB.prepare('UPDATE sessions SET expires=?').bind(expired).run();
 assert.equal((await admin('/api/admin/responses')).status,401);
});
test('login throttling and scheduled expiry cleanup',async()=>{
 const env=environment();
 for(let i=0;i<6;i++)assert.equal((await worker.fetch(post('/api/admin/login',{password:'wrong'}),env)).status,401);
 assert.equal((await worker.fetch(post('/api/admin/login',{password:env.ADMIN_PASSWORD}),env)).status,429);
 await env.DB.prepare('UPDATE rate_limits SET expires=0').run();await worker.scheduled(null,env);
 assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM rate_limits').first()).n,0);
 const response=await worker.fetch(request('/admin'),env);assert.equal(response.status,200);assert.ok(response.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
});
