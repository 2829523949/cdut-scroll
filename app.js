import { questions, calculate, info, isAnswered, activeCount, isComplete } from './model.js?v=wjx-20261023';
import { buildInsights } from './insights.js?v=wjx-20261023';
import { createQRCode } from './qr.js';
import { collection } from './collection-config.js?v=results-20261023';
import { PRIVACY_VERSION, newReceipt, sendResponse } from './response-client.js?v=results-20261023';
import { portraitFor } from './persona-art.js?v=pigs-20261024';

const PUBLIC_URL = new URL('.', location.href).href;
const STORAGE_KEY = 'cdut-scroll-questionnaire-v4';
const app = document.querySelector('#app');
const dialog = document.querySelector('#share-dialog');
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
const backArrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>';
const axes = [['随手刷 S', '深潜刷 D'], ['信息脑 I', '情绪脑 E'], ['专业清晰 W', '轻松共鸣 M'], ['潜水陪伴 Q', '扩音互动 V']];
let state = readState();
let toastTimer;
let shareTrigger;
let storageAvailable = true;
let pendingSubmission = null;

function blankState() { return { answers: Array(questions.length).fill(null), step: 0, consent: false, privacy: null, receipt: null }; }
function readState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || sessionStorage.getItem('cdut-scroll-questionnaire-v3'));
    if (!saved || !Array.isArray(saved.answers) || saved.answers.length !== questions.length) return blankState();
    if (!saved.answers.every((answer, index) => answer === null || isAnswered(answer, index))) return blankState();
    const receipt = saved.receipt && /^[a-f0-9-]{36}$/.test(saved.receipt.id) && /^[a-f0-9]{64}$/.test(saved.receipt.editToken) && Number.isSafeInteger(saved.receipt.revision) && saved.receipt.revision >= 0 ? saved.receipt : null;
    return { answers: saved.answers, step: Number.isInteger(saved.step) ? Math.max(0, Math.min(activeCount(saved.answers) - 1, saved.step)) : 0, consent: saved.consent === true && (!collection.enabled || saved.privacy === PRIVACY_VERSION), privacy: saved.privacy || null, receipt };
  } catch { return blankState(); }
}
function saveState() {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { if (storageAvailable) { storageAvailable = false; toast('这次进度暂时无法保留，离开页面前请先完成测试。'); } }
}
function answeredCount() { return state.answers.slice(0, activeCount(state.answers)).filter((answer, index) => isAnswered(answer, index)).length; }
function complete() { return isComplete(state.answers); }
function firstUnanswered() { return state.answers.slice(0, activeCount(state.answers)).findIndex((answer, index) => !isAnswered(answer, index)); }
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
function toast(message) {
  const element = document.querySelector('#toast');
  clearTimeout(toastTimer); element.textContent = message; element.classList.add('visible');
  toastTimer = setTimeout(() => element.classList.remove('visible'), 4000);
}
function navigate(hash) {
  if (location.hash === hash) renderRoute(true);
  else location.hash = hash;
}
function focusPage() {
  const target = app.querySelector('h1, legend');
  if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function renderRoute(focus = true) {
  const questionMatch = location.hash.match(/^#question-(\d+)$/);
  if (location.hash === '#result' && complete() && state.consent) renderResult();
  else if (questionMatch && state.consent) {
    const requested = Number(questionMatch[1]) - 1;
    const firstEmpty = firstUnanswered();
    const available = firstEmpty === -1 ? activeCount(state.answers) - 1 : firstEmpty;
    state.step = Math.max(0, Math.min(requested, available, activeCount(state.answers) - 1));
    if (requested !== state.step) history.replaceState(null, '', `#question-${state.step + 1}`);
    saveState(); renderQuestion();
  } else {
    if (location.hash !== '#home' && location.hash !== '') history.replaceState(null, '', '#home');
    renderHome();
  }
  document.querySelector('meta[name="theme-color"]').content = app.querySelector('.pig-home') ? '#c6e7f8' : '#f7f5ef';
  if (focus) focusPage();
}
function renderHome() {
  document.title = '成理刷屏人格测试 · 成理青年观察';
  const count = answeredCount();
  const ringCodes = ['SIWQ','SIWV','SIMQ','SIMV','DIWQ','SEWQ','DEMQ','DEWV','SEMQ','SEMV','DEMV','ZEN'];
  app.innerHTML = `<section class="home pig-home">
    ${count ? `<div class="resume-note">${complete() ? '你的人格画像已解锁，可以再看看。' : `上次已完成 ${count} / ${activeCount(state.answers)} 题，可以接着答。`} <button class="text-button" id="clear-progress">清除本次进度</button></div>` : ''}
    <div class="pig-stage">
      <div class="pig-ring" aria-hidden="true">${ringCodes.map((code, index) => `<img class="ring-pig pig-${index + 1}" src="${portraitFor({code}).thumbSrc}" alt="" width="384" height="384" decoding="async" draggable="false">`).join('')}</div>
      <div class="intro home-core"><h1><span>成理人，</span><span>你是哪种</span><span>刷屏人格？</span></h1>
        <div class="facts"><div><strong>16</strong>道题</div><div><strong>≈ 3</strong>分钟</div><div><strong>16 + 1</strong>种画像</div></div>
        <form id="start-form" class="start-form"><label class="consent"><input type="checkbox" id="agree" name="preview-consent" ${state.consent ? 'checked' : ''} required><span>${collection.enabled ? '我了解这是娱乐向测试，并同意保存本次问卷答案和画像，仅供站点管理者查看与统计。' : '我了解这是娱乐向测试，会按最近 7 天的真实习惯作答。'}</span></label>
          ${collection.enabled ? '<p class="save-notice">保存内容包含性别、年级、专业类别、观看习惯、各题选择及画像，不要求姓名或手机号。按最近 7 天的真实感受填写即可。</p>' : ''}
          <button class="button primary full" type="submit" id="start-button" ${state.consent ? '' : 'disabled'}>${complete() ? '查看我的人格结果' : count ? '继续我的测试' : '解锁我的刷屏人格'} ${arrow}</button>
        </form><p class="helper start-helper">娱乐向测试，不构成心理测量，不代表能力或优劣。</p>
      </div>
    </div>
    <div class="home-footnote"><span>第 4 题选择“基本不看”，将直接结束测试。</span><span>没有标准答案，也没有哪一种更优秀。</span></div>
    <div id="restart-region"></div>
  </section>`;
  const agree = app.querySelector('#agree');
  agree.addEventListener('change', () => { state.consent = agree.checked; state.privacy = agree.checked && collection.enabled ? PRIVACY_VERSION : null; saveState(); app.querySelector('#start-button').disabled = !agree.checked; });
  app.querySelector('#start-form').addEventListener('submit', event => {
    event.preventDefault(); if (!agree.checked) return;
    state.consent = true; state.privacy = collection.enabled ? PRIVACY_VERSION : null; saveState();
    navigate(complete() ? '#result' : `#question-${state.step + 1}`);
  });
  app.querySelector('#clear-progress')?.addEventListener('click', () => promptRestart('#restart-region'));
}
function renderQuestion() {
  const index = state.step;
  const [title, options, meta] = questions[index];
  const multiple = meta.type === 'multiple';
  const rating = meta.type === 'rating';
  const selected = multiple ? state.answers[index] || [] : [state.answers[index]];
  const ratingWords = ['完全不同意', '不同意', '中立', '同意', '完全同意'];
  document.title = `第 ${index + 1} / ${questions.length} 题 · 成理刷屏人格测试`;
  const hint = multiple ? `可多选${meta.maxChoices < options.length ? `，最多选择 ${meta.maxChoices} 项` : ''}，至少选择一项。` : rating ? '按认同程度打分：1 = 完全不同意，5 = 完全同意。' : index === 3 ? '选择“基本不看”后，将跳过后续问题，直接查看轻接触画像。' : index < 3 ? '选择符合你的情况的一项；基本信息不参与人格评分。' : '回想过去 7 天，选择最符合你的一项。';
  app.innerHTML = `<div class="question-shell">
    <aside class="question-sidebar"><a href="#home" class="back-home">${backArrow} 返回测试首页</a><h2>我的刷屏切片</h2><p>慢慢选，照着你的节奏来。</p>
      <nav class="step-grid" aria-label="题目导航">${questions.map((_, i) => `<button class="step-button ${i === index ? 'current' : ''}" data-step="${i}" ${i === index ? 'aria-current="step"' : ''}>${String(i + 1).padStart(2, '0')}</button>`).join('')}</nav>
      <p class="local-note">答案没有好坏之分。<br>按你最近的真实习惯选择就好。</p>
    </aside>
    <section class="question-content" aria-labelledby="question-title"><div class="progress-heading"><span id="progress-label"></span><strong id="question-position"></strong></div><progress value="${answeredCount()}" max="${activeCount(state.answers)}" aria-label="已完成的题目数量"></progress>
      <form id="question-form"><fieldset><legend id="question-title">${escapeHTML(title)}</legend><p class="helper question-hint" id="question-hint">${hint}</p>
        <div class="options ${rating ? 'rating-options' : ''}">${options.map((option, i) => `<label class="option"><input type="${multiple ? 'checkbox' : 'radio'}" name="answer" value="${i}" aria-describedby="question-hint" ${selected.includes(i) ? 'checked' : ''}><span class="option-letter" aria-hidden="${rating ? 'false' : 'true'}">${rating ? option : meta.letters[i]}</span><span class="option-text">${escapeHTML(rating ? ratingWords[i] : option)}</span></label>`).join('')}</div>
      </fieldset><div class="question-nav"><a class="button" href="${index ? `#question-${index}` : '#home'}">${backArrow}${index ? '上一题' : '返回首页'}</a><button class="button primary" type="submit" id="next-button"></button></div>
      <p class="question-status" role="status" aria-live="polite" id="selection-status"></p><a class="text-button review-result" id="review-result" href="#result" hidden>更新并查看画像</a></form>
      <p class="helper center question-bottom">没有哪一种更优秀。你的答案只代表这一次的观看习惯。</p>
    </section>
  </div>`;
  app.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => navigate(`#question-${Number(button.dataset.step) + 1}`)));
  function updateQuestionUI() {
    const count = activeCount(state.answers), empty = firstUnanswered();
    const furthest = empty === -1 ? count - 1 : empty;
    const valid = isAnswered(state.answers[index], index);
    app.querySelector('#next-button').disabled = !valid;
    app.querySelector('#next-button').innerHTML = `${index === count - 1 ? '生成人格结果' : '下一题'} ${arrow}`;
    app.querySelector('#progress-label').textContent = `已完成 ${answeredCount()} 道题`;
    app.querySelector('#question-position').textContent = `第 ${index + 1} / ${count} 题`;
    app.querySelector('progress').max = count; app.querySelector('progress').value = answeredCount();
    const picked = multiple ? state.answers[index] || [] : [];
    app.querySelector('#selection-status').textContent = multiple ? `已选 ${picked.length} 项${meta.maxChoices < options.length ? `，最多 ${meta.maxChoices} 项` : ''}。` : index === 3 && count === 4 ? '后续 12 题已跳过，可以直接查看画像。' : valid ? '已选择，可修改后继续。' : '';
    if (multiple) app.querySelectorAll('input[name="answer"]').forEach(input => { input.disabled = picked.length >= meta.maxChoices && !input.checked; });
    app.querySelectorAll('[data-step]').forEach(button => {
      const i = Number(button.dataset.step), skipped = i >= count, done = isAnswered(state.answers[i], i) && !skipped;
      button.disabled = skipped || i > furthest;
      button.classList.toggle('done', done); button.classList.toggle('skipped', skipped);
      button.setAttribute('aria-label', `第 ${i + 1} 题，${skipped ? '已跳过' : done ? '已作答' : '未作答'}`);
    });
    app.querySelector('#review-result').hidden = !complete();
  }
  app.querySelector('#question-form').addEventListener('change', event => {
    if (event.target.name !== 'answer') return;
    if (multiple) {
      const picked = [...app.querySelectorAll('input[name="answer"]:checked')].map(input => Number(input.value));
      if (picked.length > meta.maxChoices) { event.target.checked = false; toast(`本题最多选择 ${meta.maxChoices} 项，请先取消一项。`); return; }
      state.answers[index] = picked.length ? picked : null;
    } else state.answers[index] = Number(event.target.value);
    saveState(); updateQuestionUI();
  });
  app.querySelector('#question-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!isAnswered(state.answers[index], index)) { toast('先选择至少一项，再继续。'); app.querySelector('input[name="answer"]').focus(); return; }
    navigate(index === activeCount(state.answers) - 1 ? '#result' : `#question-${index + 2}`);
  });
  updateQuestionUI();
}
function renderResult() {
  const result = calculate(state.answers);
  const report = buildInsights(state.answers);
  const content = { ...info(result), tags: report.tags };
  document.title = `${result.name} · 我的成理刷屏人格`;
  const portrait = portraitFor(result);
  app.innerHTML = `<section class="result-shell"><div class="result-top"><div><p class="result-intro">你的成理刷屏人格已解锁</p><div class="result-code" translate="no">${result.code}</div><h1>${result.name}</h1><div class="tags">${content.tags.map(tag => `<span>${tag}</span>`).join('')}</div></div><img class="result-mascot" src="${portrait.src}" alt="${portrait.alt}" width="768" height="768" decoding="async" fetchpriority="high"></div>
    <p class="result-desc">${report.summary}</p>
    ${collection.enabled ? '<section class="submission-panel" id="submission-panel" aria-label="答卷保存状态"><p id="submission-message" role="status" aria-live="polite">正在保存这次答卷…</p><button class="text-button" id="retry-submission" hidden>重新保存答卷</button></section>' : ''}
    <section class="result-section dimensions-section" aria-labelledby="axes-title"><h2 id="axes-title">你的四维切片</h2><p class="helper">从观看节奏、内容动机、表达关注和互动方式，看看这次回答里的你。</p>${report.dimensions.map(dimension => {
      const percent = dimension.leftPercent;
      return `<article class="dimension" data-dimension="${dimension.id}" data-status="${dimension.status}"><div class="dimension-heading"><h3>${dimension.title}</h3><span class="dimension-badge">${dimension.label}</span></div><div class="axis-label"><span>${dimension.left} ${percent === null ? '' : `<strong>${percent}%</strong>`}</span><span>${percent === null ? '' : `<strong>${100 - percent}%</strong>`} ${dimension.right}</span></div><div class="axis-track ${percent === null ? 'axis-empty' : ''}" aria-hidden="true">${percent === null ? '' : `<span style="width:${percent}%"></span>`}</div><p class="dimension-description">${dimension.description}</p>${dimension.evidence.length ? `<details class="dimension-evidence"><summary>看看这条切片的依据</summary><p class="helper">${dimension.note}</p><ul>${dimension.evidence.map(item => `<li><a href="#question-${item.index + 1}">第 ${item.index + 1} 题</a><span>你选择了“${escapeHTML(item.answer)}”</span><small>${item.direction}</small></li>`).join('')}</ul></details>` : ''}</article>`;
    }).join('')}<p class="helper axis-note">比例表示本次回答中的倾向，不是人群排名、能力分数或心理测量。线索不足时不显示比例。</p></section>
    <section class="host-section" aria-labelledby="host-title"><h2 id="host-title">适合尝试的主持风格</h2><h3 class="host-heading">${report.host.title}</h3><p class="host-intro">${report.host.intro}</p><div class="host-profiles">${[...report.host.recommendations, ...report.host.exploration].map((profile, index) => `<details class="host-profile" ${index === 0 ? 'open' : ''}><summary><span>${profile.title}</span><small>${report.host.status === 'open' ? '可以探索' : profile.primary ? '优先尝试' : '也可尝试'}</small></summary><div class="host-profile-body"><p>${profile.summary}</p><div class="tags">${profile.tags.map(tag => `<span>${tag}</span>`).join('')}</div><dl><dt>适合的内容形式</dt><dd>${profile.format}</dd><dt>一句话感受这种表达</dt><dd class="host-sample">“${profile.sample}”</dd></dl></div></details>`).join('')}</div>${report.host.evidence.length ? `<details class="host-evidence"><summary>为什么这样推荐？</summary><ul>${report.host.evidence.map(item => `<li><a href="#question-${item.index + 1}">第 ${item.index + 1} 题</a><span>${escapeHTML(item.answer)}</span></li>`).join('')}</ul><p class="helper">建议参考内容兴趣、吸引你继续观看的原因和主要目的，不使用性别、年级、专业或账号来源推断主持风格。</p></details>` : ''}${report.host.avoidance ? `<div class="watch-preference"><h3>${report.host.avoidance.title}</h3><p>${report.host.avoidance.text}</p><a class="text-button" href="#question-10">回看这项选择</a></div>` : ''}</section>
    <section class="result-section suggestions"><div><h2>适合出没的校园场景</h2>${report.scenes.map(scene => `<h3 class="scene-title">${scene.title}</h3><p>${scene.text}</p>`).join('')}</div><div><h2>试试这样发现同频内容</h2><p>${report.host.status === 'matched' ? '先选一种推荐的表达风格，看一小段同主题内容；再换另一种，留意哪种让你更愿意看下去。' : '从你正在关心的问题开始挑内容，喜欢就继续，不喜欢就换一个。偏好可以慢慢发现。'}</p><p class="helper discovery-note">想法变了也没关系，可以返回修改答案，看看画像怎样变化。</p></div></section>
    ${report.observations.length ? `<section class="result-section observations"><h2>你的内容观察</h2><p class="helper">保留你的原始感受，不合并成能力或人格分数。</p>${report.observations.map(item => `<article><h3>${item.title}</h3><p>${escapeHTML(item.text)}</p><a class="text-button" href="#question-${item.index + 1}">回看第 ${item.index + 1} 题</a></article>`).join('')}</section>` : ''}<section class="buddy"><h2>你的同频校园搭子</h2><p>${report.buddy}</p></section>
    <p class="receipt">画像已经解锁。把它分享给校园搭子，看看你们有哪些同频的地方。</p>
    <div class="result-actions"><button class="button primary" id="make-card">生成我的分享卡片 ${arrow}</button><button class="button" id="copy-text">复制分享文案</button></div><button class="text-button invite-friend" id="invite-friend">邀请朋友也来测一测</button><div id="share-fallback" class="share-output" hidden></div>
    <div class="question-nav"><a class="text-button" href="#question-${activeCount(state.answers)}">返回检查答案</a><button class="text-button" id="restart">重新测试</button></div><div id="restart-region"></div>
    <details class="rules"><summary>怎样理解这份画像？</summary><p>四维切片是基于本次观看习惯制作的娱乐解读，不是问卷提供的标准量表。多选题按题内平均计入，性别、年级、专业、账号来源与认同评分不参与人格计分。主持风格根据内容兴趣与观看原因提供尝试建议。两边都合拍，或还没有明显偏好，都是正常结果。</p><p>人格代号方便区分画像，不是永久标签。你可以点开各项依据，回看或修改答案。所有内容仅供轻松交流，不构成心理测量，也不代表能力或优劣。</p></details>
  </section>`;
  app.querySelector('#make-card').addEventListener('click', event => makeCard(result, content, event.currentTarget, report));
  app.querySelector('#copy-text').addEventListener('click', () => copyText(result, content));
  app.querySelector('#invite-friend').addEventListener('click', event => openShareLink(event.currentTarget));
  app.querySelector('#restart').addEventListener('click', () => promptRestart('#restart-region'));
  app.querySelector('#retry-submission')?.addEventListener('click', () => persistResponse());
  persistResponse();
}
async function persistResponse() {
  if (!collection.enabled || !complete() || !state.consent || state.privacy !== PRIVACY_VERSION) return;
  const signature = JSON.stringify(state.answers);
  if (!state.receipt) state.receipt = newReceipt();
  const receipt = state.receipt;
  if (receipt.signature !== signature) { receipt.signature = signature; receipt.revision += 1; }
  function status(kind, text) {
    if (state.receipt?.id !== receipt.id || JSON.stringify(state.answers) !== signature) return;
    const panel = app.querySelector('#submission-panel'); if (!panel) return;
    panel.dataset.status = kind;
    app.querySelector('#submission-message').textContent = text;
    app.querySelector('#retry-submission').hidden = kind !== 'error';
  }
  if (receipt.savedSignature === signature) { status('saved', '答卷已保存，感谢分享你的观看习惯。'); return; }
  if (pendingSubmission?.id === receipt.id && pendingSubmission.signature === signature) return;
  status('saving', '正在保存这次答卷…'); saveState();
  const task = { id: receipt.id, signature }; pendingSubmission = task;
  try {
    await sendResponse(collection.apiBase, structuredClone(state.answers), { ...receipt });
    if (state.receipt?.id === receipt.id && state.receipt.signature === signature) { state.receipt.savedSignature = signature; saveState(); }
    status('saved', '答卷已保存，感谢分享你的观看习惯。');
  } catch (error) { status('error', error.message); }
  finally { if (pendingSubmission === task) pendingSubmission = null; }
}
function promptRestart(selector) {
  const region = app.querySelector(selector);
  region.innerHTML = `<div class="restart-prompt" role="group" aria-label="确认重新测试">清除这次的全部答案，重新开始？<div><button class="button primary" id="confirm-restart">清除并重新开始</button><button class="button" id="cancel-restart">保留答案</button></div></div>`;
  region.querySelector('#cancel-restart').addEventListener('click', () => { region.innerHTML = ''; (app.querySelector('#restart') || app.querySelector('#clear-progress'))?.focus(); });
  region.querySelector('#confirm-restart').addEventListener('click', () => {
    state = blankState(); saveState(); navigate('#home');
  });
  region.querySelector('#cancel-restart').focus();
  region.scrollIntoView({ block: 'nearest', behavior: 'instant' });
}
function shareText(result, content) {
  return `我的成理刷屏人格是 ${result.code}「${result.name}」！${content.tags.join(' · ')}。来看看我们是不是同频校园搭子：${PUBLIC_URL}\n（娱乐向测试，不构成心理测量。）`;
}
async function copyText(result, content) {
  const text = shareText(result, content);
  try { await navigator.clipboard.writeText(text); toast('分享文案已复制。'); }
  catch {
    const fallback = app.querySelector('#share-fallback');
    fallback.hidden = false;
    fallback.innerHTML = '<label for="share-text">暂时无法自动复制，请长按或选中文案复制：</label><textarea id="share-text" readonly></textarea>';
    const textarea = fallback.querySelector('textarea'); textarea.value = text; textarea.focus(); textarea.select();
    toast('请选中下方文案，手动复制。');
  }
}
function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image); image.onerror = reject; image.src = source;
  });
}
async function makeCard(result, content, trigger, report) {
  trigger.disabled = true; trigger.setAttribute('aria-busy', 'true');
  const originalLabel = trigger.innerHTML; trigger.textContent = '正在绘制分享卡片…';
  try {
    const [mascot, qr] = await Promise.all([loadImage(portraitFor(result).src), createQRCode(PUBLIC_URL).then(loadImage)]);
    const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 1260;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.fillStyle = '#f7f5ef'; context.fillRect(0, 0, 900, 1260);
    context.fillStyle = '#e9e1ff'; context.fillRect(0, 0, 900, 450);
    context.fillStyle = '#7050db'; context.fillRect(0, 0, 900, 12);
    context.font = '23px "Microsoft YaHei", sans-serif'; context.fillText('CDUT / 成理刷屏人格测试', 60, 75);
    context.font = 'bold 100px "Microsoft YaHei", sans-serif'; context.fillText(result.code, 60, 220);
    context.fillStyle = '#292532'; context.font = 'bold 46px "Microsoft YaHei", sans-serif'; context.fillText(result.name, 60, 300);
    context.font = '22px "Microsoft YaHei", sans-serif'; context.fillStyle = '#5636b8'; context.fillText(content.tags.join('  /  '), 60, 365);
    context.drawImage(mascot, 540, 95, 310, 310);
    axes.forEach(([left, right], index) => {
      const y = 525 + index * 105;
      context.fillStyle = '#292532'; context.font = '24px "Microsoft YaHei", sans-serif'; context.fillText(`${left} / ${right}`, 65, y);
      const percent = report.dimensions[index].leftPercent;
      context.textAlign = 'right'; context.fillText(percent === null ? '待探索' : `${percent}% / ${100 - percent}%`, 835, y); context.textAlign = 'left';
      context.fillStyle = percent === null ? '#ded9e7' : '#d9ef9d'; context.fillRect(65, y + 20, 770, 17);
      if (percent !== null) { context.fillStyle = '#7050db'; context.fillRect(65, y + 20, 770 * percent / 100, 17); }
    });
    context.fillStyle = '#292532'; context.font = 'bold 28px "Microsoft YaHei", sans-serif'; context.fillText('宿舍这么大，', 65, 1010); context.fillText('总有一个同频的你。', 65, 1055);
    context.fillStyle = '#696274'; context.font = '20px "Microsoft YaHei", sans-serif'; context.fillText(result.hidden ? '轻量接触 / 自在观察' : '16 道题 / 约 3 分钟', 65, 1110); context.fillText('扫码，找到你的校园搭子', 65, 1145);
    context.drawImage(qr, 650, 970, 190, 190);
    context.font = '16px "Microsoft YaHei", sans-serif'; context.fillText('娱乐向测试 · 不构成心理测量', 65, 1200);
    context.fillText('百分比为选项计分占比，不是心理测量或人群百分位', 65, 1230);
    const url = canvas.toDataURL('image/png');
    const image = document.createElement('img');
    image.id = 'card-image'; image.alt = `${result.name} · 我的成理刷屏人格分享卡片`; image.width = 900; image.height = 1260; image.src = url;
    document.querySelector('#card-slot').replaceChildren(image);
    document.querySelector('#download-card').href = url;
    shareTrigger = trigger; dialog.showModal();
  } catch { toast('卡片生成失败，请使用“复制分享文案”后重试。'); }
  finally { trigger.disabled = false; trigger.removeAttribute('aria-busy'); trigger.innerHTML = originalLabel; }
}
document.querySelector('#public-link').value = PUBLIC_URL;
document.querySelector('link[rel=canonical]').href = PUBLIC_URL;
document.querySelector('meta[property="og:url"]').content = PUBLIC_URL;
document.querySelector('meta[property="og:image"]').content = new URL('assets/pigs/overview.jpg', PUBLIC_URL).href;
const linkDialog = document.querySelector('#link-dialog');
let linkTrigger;
async function openShareLink(trigger) {
  linkTrigger = trigger; linkDialog.showModal();
  const qrImage = document.querySelector('.link-qr');
  qrImage.hidden = true;
  try { qrImage.src = await createQRCode(PUBLIC_URL); qrImage.hidden = false; } catch { /* The selectable link remains available. */ }
  document.querySelector('#link-feedback').textContent = '';
}
async function copyPublicLink() {
  try { await navigator.clipboard.writeText(PUBLIC_URL); document.querySelector('#link-feedback').textContent = '测试链接已复制，可以发给朋友了。'; }
  catch {
    const input = document.querySelector('#public-link'); input.focus(); input.select();
    document.querySelector('#link-feedback').textContent = '暂时无法自动复制。链接已选中，请长按或按 Ctrl+C 复制。';
  }
}
document.querySelector('#share-site').addEventListener('click', event => openShareLink(event.currentTarget));
document.querySelector('#close-link').addEventListener('click', () => linkDialog.close());
document.querySelector('#copy-link').addEventListener('click', copyPublicLink);
linkDialog.addEventListener('close', () => linkTrigger?.focus());
document.querySelector('#close-share').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => shareTrigger?.focus());
window.addEventListener('hashchange', () => renderRoute(true));
renderRoute(false);
