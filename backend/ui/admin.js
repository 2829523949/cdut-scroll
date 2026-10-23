const $=selector=>document.querySelector(selector);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=value=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
let page=1, rows=[], statistics=null, loaded=false, requestNumber=0, busy=false, authenticated=false;
const names=['静音情报员','校园情报站','冷面梗侦探','热梗速递员','下饭陪伴家','课间暖场王','快乐潜水员','气氛发动机','深潜研究员','知识传送门','犀利观察家','观点扩音器','深夜树洞客','共鸣连接者','故事收藏家','话题策展人'];
for(let i=0;i<16;i++){const code=['SD','IE','WM','QV'].map((letters,k)=>letters[(i>>(3-k))&1]).join('');$('#code').add(new Option(names[i]+' · '+code,code));}
$('#code').add(new Option('佛系观察员 · ZEN','ZEN'));
function message(text,error=false){$('#workspace-message').textContent=text;$('#workspace-message').classList.toggle('error',error);}
function showLogin(text='') { requestNumber++; authenticated=false; $('#workspace').hidden=true; $('#logout').hidden=true; $('#login-panel').hidden=false; $('#login-message').textContent=text; loaded=false; rows=[]; statistics=null; for(const target of ['#records','#type-chart','#question-stats','#detail-body']) $(target).replaceChildren(); $('#detail').close(); }
async function api(path,options={}){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
 if(response.status===401){showLogin('请登录后继续。');throw new Error('请登录后继续。');}
 if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'读取失败，请稍后重试。');}
 return response;
}
function query(){const p=new URLSearchParams();for(const key of ['from','to','code'])if($('#'+key).value)p.set(key,$('#'+key).value);return p;}
function setBusy(value){busy=value;for(const selector of ['#refresh','#export','#filters button','#reset']) document.querySelectorAll(selector).forEach(button=>button.disabled=value);}
function renderRows(data){
 rows=data.rows;$('#empty').hidden=data.total!==0;$('.table-wrap').hidden=data.total===0;$('.pagination').hidden=data.total===0;
 $('#page-label').textContent=`第 ${data.page} / ${Math.max(1,Math.ceil(data.total/data.pageSize))} 页`;
 $('#previous').disabled=page<=1;$('#next').disabled=page*data.pageSize>=data.total;
 const labels=statistics?.questions||[];
 $('#records').innerHTML=rows.map((row,index)=>`<tr><td><time datetime="${escape(row.createdAt)}">${date(row.createdAt)}</time></td><td><strong>${escape(row.name)}</strong><small>${escape(row.code)}</small></td><td>${row.answers.slice(0,3).map((value,i)=>escape(labels[i]?.options[value]??'—')).join(' / ')}</td><td><button class="quiet" data-detail="${index}">查看详情</button></td></tr>`).join('');
}
function bar(label,count,max){return `<div class="bar-row"><span>${escape(label)}</span><meter class="bar-track" min="0" max="${max||1}" value="${count}" aria-label="${escape(label)}：${count} 份"></meter><strong>${count} 份</strong></div>`;}
function renderStats(data){
 $('#total').textContent=data.summary.total;$('#today').textContent=data.summary.today||0;$('#skipped').textContent=data.summary.skipped||0;
 $('#type-chart').innerHTML=data.types.length?data.types.map(type=>bar(type.name+' · '+type.code,type.count,data.summary.total)).join(''):'<p class="muted">当前范围还没有答卷，收到回答后会显示分布。</p>';
 $('#question-stats').innerHTML=data.questions.map(q=>`<details class="question-stat"><summary>${q.number}. ${escape(q.title)}</summary><p class="muted">${q.type==='multiple'?'多选题 · 每份答卷可选择多项':'评分题或单选题 · 每份答卷选择一项'}</p>${q.options.map((option,i)=>bar(option,q.counts[i],Math.max(...q.counts,1))).join('')}</details>`).join('');
}
async function load(){
 const request=++requestNumber;setBusy(true);message('正在读取答卷…');
 const q=query(), list=new URLSearchParams(q);list.set('page',page);
 try{
  const [stats,data]=await Promise.all([api('/api/admin/stats?'+q).then(r=>r.json()),api('/api/admin/responses?'+list).then(r=>r.json())]);
  if(request!==requestNumber)return;
  if(data.total>0 && data.rows.length===0 && page>1){page=Math.ceil(data.total/data.pageSize);return load();}
  statistics=stats;renderRows(data);renderStats(stats);loaded=true;$('#export').disabled=data.total===0;message(`已更新 · ${date(new Date().toISOString())}`);
 }catch(error){if(request===requestNumber)message(error.message,true);}
 finally{if(request===requestNumber){setBusy(false);$('#export').disabled=!loaded||!statistics?.summary.total;}}
}
async function enter(){ authenticated=true;$('#login-panel').hidden=true;$('#workspace').hidden=false;$('#logout').hidden=false;$('#password').value='';await load(); }
$('#login-form').addEventListener('submit',async event=>{
 event.preventDefault();$('#login-submit').disabled=true;$('#login-message').textContent='正在登录…';
 try{await api('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('#password').value})});$('#login-message').textContent='';page=1;await enter();}
 catch(error){$('#login-message').textContent=error.message;}
 finally{$('#login-submit').disabled=false;}
});
$('#logout').addEventListener('click',async()=>{try{await api('/api/admin/logout',{method:'POST'});showLogin('已退出登录。');}catch(error){message(error.message,true);}});
$('#filters').addEventListener('submit',event=>{event.preventDefault();page=1;load();});
$('#reset').addEventListener('click',()=>{$('#filters').reset();page=1;load();});
$('#refresh').addEventListener('click',()=>load());
$('#previous').addEventListener('click',()=>{if(!busy&&page>1){page--;load();}});
$('#next').addEventListener('click',()=>{if(!busy){page++;load();}});
for(const name of ['records','stats']) $('#tab-'+name).addEventListener('click',()=>{for(const tab of ['records','stats']){$('#'+tab+'-panel').hidden=tab!==name;$('#tab-'+tab).setAttribute('aria-pressed',String(tab===name));}});
$('#records').addEventListener('click',event=>{
 const button=event.target.closest('[data-detail]');if(!button)return;
 const row=rows[Number(button.dataset.detail)];if(!row)return;
 $('#detail-title').textContent=row.name+' · '+row.code;
 $('#detail-body').innerHTML=`<p class="detail-meta">答卷编号：${escape(row.id)}<br>提交：${date(row.createdAt)}<br>更新：${date(row.updatedAt)}</p><div class="detail-dimensions">${row.dimensions.map(d=>`<span>${escape(d.title)}：${d.leftPercent===null?'暂不判断':`左侧倾向 ${d.leftPercent}%`}</span>`).join('')}</div>${statistics.questions.map((q,i)=>`<article class="answer-row"><h3>${i+1}. ${escape(q.title)}</h3><p>${row.answers[i]===null?'已跳过':(Array.isArray(row.answers[i])?row.answers[i]:[row.answers[i]]).map(value=>escape(q.options[value])).join('\n')}</p></article>`).join('')}`;
 $('#detail').showModal();$('#detail-body').scrollTop=0;
});
$('#close-detail').addEventListener('click',()=>$('#detail').close());
$('#export').addEventListener('click',async()=>{
 $('#export').disabled=true;message('正在准备导出文件…');
 try{
  const response=await api('/api/admin/export?'+query()),blob=await response.blob();
  if(!authenticated)return;
  const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='成理答卷-'+new Date().toISOString().slice(0,10)+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),30000);
  message('已导出 CSV 文件，可直接使用 Excel 打开。');
 }catch(error){message(error.message,true);}finally{$('#export').disabled=false;}
});
try{await api('/api/admin/session');await enter();}catch{showLogin();}
