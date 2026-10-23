import { collection } from './collection-config.js?v=results-20261023';
const message=document.querySelector('#admin-message'),link=document.querySelector('#admin-link');
if(collection.enabled && /^https:\/\//.test(collection.apiBase)) {
  const target=new URL('/admin',collection.apiBase).href;
  link.href=target;link.hidden=false;message.textContent='即将进入管理员登录页。';
  location.replace(target);
} else message.textContent='答卷管理尚未启用，完成设置后可以从这里登录。';
