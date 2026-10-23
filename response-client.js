export const PRIVACY_VERSION = '2026-10-23-v1';
export const QUESTION_VERSION = 'wjx-20261023';
export function newReceipt() {
  return { id:crypto.randomUUID(),editToken:[...crypto.getRandomValues(new Uint8Array(32))].map(value=>value.toString(16).padStart(2,'0')).join(''),revision:0,signature:null,savedSignature:null };
}
export async function sendResponse(apiBase,answers,receipt,fetcher=fetch) {
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
  try {
    const response=await fetcher(apiBase.replace(/\/$/,'')+'/api/responses',{
      method:'POST',mode:'cors',credentials:'omit',signal:controller.signal,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:receipt.id,editToken:receipt.editToken,revision:receipt.revision,answers,consent:true,privacyVersion:PRIVACY_VERSION,version:QUESTION_VERSION})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok || data.saved!==true) throw new Error(data.error||'答卷还没有保存成功，请稍后重试。');
    return data;
  } catch(error) {
    if(error.name==='AbortError' || error instanceof TypeError) throw new Error('暂时未能保存答卷，请检查网络后重试。你的画像仍可查看。');
    throw error;
  } finally { clearTimeout(timer); }
}
