import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = window.firebaseConfig;
const cloudinaryConfig = window.cloudinaryConfig || {};
const $ = s => document.querySelector(s);
const esc = s => String(s || '').replace(/[&<>"']/g, x => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[x]));
const colorSet = ['#c3b58c','#9db8c5','#d7886d','#a6bf94'];

let app, authService, store;
let session = null, page = 'home', authMode = 'login', selectedRole = 'artist';
const db = { works: [], shows: [], apps: [], hiddenShows: [] };
const newestFirst = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
const isRecruiting = show => !show.endDate || new Date(`${show.endDate}T23:59:59`).getTime() >= Date.now();

function toast(message) {
  const t = $('#toast');
  t.textContent = message;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* Legacy error text retained only for source history.
function friendlyError(error) {
  const messages = {
    'auth/email-already-in-use': '该邮箱已注册，请直接登录。',
    'auth/invalid-credential': '邮箱或密码不正确。',
    'auth/weak-password': '密码至少需要 6 位。',
    'auth/invalid-email': '请输入有效的邮箱地址。',
    'permission-denied': '没有执行此操作的权限。'
  };
  return messages[error?.code] || '操作未完成，请稍后再试。';
}
*/
/*
function friendlyError(error) {
  const messages = {
    'auth/email-already-in-use': '该邮箱已经注册，请直接登录。',
    'auth/invalid-credential': '邮箱或密码不正确。',
    'auth/weak-password': '密码至少需要 6 位。',
    'auth/invalid-email': '请输入有效的邮箱地址。',
    'permission-denied': '没有执行此操作的权限。'
  };
  return messages[error?.code] || '操作未完成，请稍后再试。';
}
*/
function friendlyError(error) {
  const messages = {
    'auth/email-already-in-use': '\u8be5\u90ae\u7bb1\u5df2\u7ecf\u6ce8\u518c\uff0c\u8bf7\u76f4\u63a5\u767b\u5f55\u3002',
    'auth/invalid-credential': '\u90ae\u7bb1\u6216\u5bc6\u7801\u4e0d\u6b63\u786e\u3002',
    'auth/weak-password': '\u5bc6\u7801\u81f3\u5c11\u9700\u8981 6 \u4f4d\u3002',
    'auth/invalid-email': '\u8bf7\u8f93\u5165\u6709\u6548\u7684\u90ae\u7bb1\u5730\u5740\u3002',
    'permission-denied': '\u6ca1\u6709\u6267\u884c\u6b64\u64cd\u4f5c\u7684\u6743\u9650\u3002'
  };
  return messages[error?.code] || '\u64cd\u4f5c\u672a\u5b8c\u6210\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002';
}
/*
async function uploadImage(file) {
  if (!file?.size) return '';
  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
    throw new Error('cloudinary/not-configured');
  }
  if (!file.type.startsWith('image/')) throw new Error('cloudinary/invalid-file');
  if (file.size > 10 * 1024 * 1024) throw new Error('cloudinary/file-too-large');
  // legacy marker
  toast('正在上传图片…');
  // legacy end
  toast('正在上传图片…');
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', cloudinaryConfig.uploadPreset);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, { method: 'POST', body });
  const result = await response.json();
  if (!response.ok || !result.secure_url) throw new Error('cloudinary/upload-failed');
  return result.secure_url;
}
*/
async function uploadImage(file) {
  if (!file?.size) return '';
  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) throw new Error('cloudinary/not-configured');
  if (!file.type.startsWith('image/')) throw new Error('cloudinary/invalid-file');
  if (file.size > 10 * 1024 * 1024) throw new Error('cloudinary/file-too-large');
  toast('Uploading image...');
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', cloudinaryConfig.uploadPreset);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, { method: 'POST', body });
  const result = await response.json();
  if (!response.ok || !result.secure_url) throw new Error('cloudinary/upload-failed');
  return result.secure_url;
}
/*
function uploadError(error) {
  const messages = {
    'cloudinary/not-configured': '图片上传服务尚未配置，请联系管理员。',
    'cloudinary/invalid-file': '请选择图片文件。',
    'cloudinary/file-too-large': '图片请控制在 10MB 以内。',
    'cloudinary/upload-failed': '图片上传失败，请稍后再试。'
  };
  return messages[error?.message] || friendlyError(error);
}

*/
function uploadError(error) {
  const messages = {
    'cloudinary/not-configured': '\u56fe\u7247\u4e0a\u4f20\u670d\u52a1\u5c1a\u672a\u914d\u7f6e\uff0c\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u3002',
    'cloudinary/invalid-file': '\u8bf7\u9009\u62e9\u56fe\u7247\u6587\u4ef6\u3002',
    'cloudinary/file-too-large': '\u56fe\u7247\u8bf7\u63a7\u5236\u5728 10MB \u4ee5\u5185\u3002',
    'cloudinary/upload-failed': '\u56fe\u7247\u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002'
  };
  return messages[error?.message] || friendlyError(error);
}
async function loadData() {
  if (!store || !session) return;
  const [works, shows] = await Promise.all([
    getDocs(collection(store, 'works')),
    getDocs(collection(store, 'shows'))
  ]);
  db.works = works.docs.map(d => ({ id: d.id, ...d.data() })).sort(newestFirst);
  db.shows = shows.docs.map(d => ({ id: d.id, ...d.data() })).sort(newestFirst);
  if (session.role === 'artist') {
    const [apps, hidden] = await Promise.all([
      getDocs(query(collection(store, 'applications'), where('artistId', '==', session.id))),
      getDocs(query(collection(store, 'hiddenShows'), where('artistId', '==', session.id)))
    ]);
    db.apps = apps.docs.map(d => ({ id: d.id, ...d.data() }));
    db.hiddenShows = hidden.docs.map(d => ({ id: d.id, ...d.data() }));
    return;
  }
  db.hiddenShows = [];
  const ownShows = db.shows.filter(show => show.ownerId === session.id);
  const groups = await Promise.all(ownShows.map(show => getDocs(query(collection(store, 'applications'), where('showId', '==', show.id)))));
  db.apps = groups.flatMap(group => group.docs.map(d => ({ id: d.id, ...d.data() })));
}

function landing() { return `<div class="landing"><header class="topbar"><div class="brand">ART <em>LIAISON</em></div><button onclick="openAuth('login')">登录 / 注册</button></header><main class="hero"><div class="eyebrow">艺术家的档案 · 策展人的视野</div><h1>让作品<br>遇见<i>合适的</i><br>展览。</h1><p>一个专为艺术家与策展人建立的作品档案、展览征集与精准发现平台。让每一次创作，通向更广阔的现场。</p><div class="roles"><a class="role-card" href="#" onclick="openAuth('register','artist');return false"><span>01 · ARTIST</span><b>我是艺术家</b><span>沉淀作品档案，投递心仪展览</span><div class="arrow">↗</div></a><a class="role-card" href="#" onclick="openAuth('register','curator');return false"><span>02 · CURATOR</span><b>我是策展人</b><span>发起征集，从作品库发现创作</span><div class="arrow">↗</div></a></div></main></div>`; }
function nav() { const items = session.role === 'artist' ? [['home','◈','工作台'],['works','▧','我的作品'],['open-calls','◉','展览征集'],['profile','○','个人资料']] : session.role === 'admin' ? [['home','◈','管理台'],['library','▤','作品管理'],['shows','◉','展览管理']] : [['home','◈','工作台'],['library','▤','作品库'],['shows','◉','我的展览'],['profile','○','机构资料']]; return `<aside class="sidebar"><div class="brand">ART <em>LIAISON</em></div><nav class="nav">${items.map(x => `<button class="${page === x[0] ? 'active' : ''}" onclick="go('${x[0]}')"><i>${x[1]}</i>${x[2]}</button>`).join('')}</nav><div class="sidefoot">ART LIAISON<br>连接创作与展览<br><button onclick="logout()" style="margin-top:12px;color:#fff">退出登录 ↗</button></div></aside>`; }
function header(title, sub, action = '') { const desk = session.role === 'artist' ? 'ARTIST STUDIO' : session.role === 'admin' ? 'ADMIN CONSOLE' : 'CURATOR DESK'; return `<div class="mainhead"><div><div class="eyebrow" style="color:var(--orange)">${desk}</div><h2>${esc(title)}</h2><div class="sub">${esc(sub)}</div></div><div class="user"><span>${esc(session.name)}</span><div class="avatar">${esc(session.name?.[0])}</div>${action}</div></div>`; }
function artCard(w) { return `<div class="art-card" style="--card:${w.color || '#b8c98a'};--accent:${w.accent || '#dc6c3c'}">${w.image ? `<img class="art-image" src="${esc(w.image)}" alt="${esc(w.title)}" loading="lazy">` : ''}<div class="tag">${esc(w.type || '绘画')} · ${esc(w.year || '—')}</div><h4>${esc(w.title)}</h4><p>${esc(w.material || '综合材料')} · ${esc(w.size || '—')}</p><small>${esc(w.exhibitionStatus || '可参展')} · ${esc(w.shipping || '可商议')}</small></div>`; }
function poster(s, allowApply = true) { return `<article class="poster" style="--poster:${s.poster || '#e85134'};--lime:${s.accent || '#cbff4d'}"><div><div class="date">OPEN CALL · 截止 ${esc(s.deadline || '待定')}</div><h3>${esc(s.title)}</h3></div><div><div class="meta">${esc(s.date || '时间待定')}<br>结束：${esc(s.endDate || '待定')}<br>${esc(s.place || '地点待定')}<br>${esc(s.host || '')}<br>运费：${esc(s.shipping || '可商议')}</div><button class="btn ghost" style="margin-top:14px;background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.5)" onclick="showDetails('${s.id}')">查看详情</button>${allowApply ? `<button class="btn" style="margin-top:8px" onclick="applyShow('${s.id}')">投递作品 ↗</button><button class="btn ghost" style="margin-top:8px;background:transparent;color:#fff;border-color:rgba(255,255,255,.5)" onclick="hideShow('${s.id}')">不感兴趣</button>` : ''}</div></article>`; }

function home() {
  const mine = db.works.filter(w => w.artistId === session.id);
  const applications = db.apps.filter(a => a.artistId === session.id);
  if (session.role === 'artist') return `${header('你好，' + session.name, '今天也适合让作品走向新的现场。', '<button class="btn lime" onclick="workModal()">+ 添加作品</button>')}<div class="stats"><div class="stat"><b>${mine.length}</b><span>作品档案</span></div><div class="stat"><b>${applications.length}</b><span>已投递展览</span></div><div class="stat"><b>${db.shows.length}</b><span>进行中征集</span></div></div><div class="sectionhead"><h3>最近作品</h3><button class="btn ghost" onclick="go('works')">管理作品 →</button></div><div class="cards">${mine.length ? mine.slice(0, 3).map(artCard).join('') : '<div class="empty">还没有作品档案。<br><button class="btn lime" style="margin-top:13px" onclick="workModal()">添加第一件作品</button></div>'}</div>`;
  if (session.role === 'admin') return `${header('平台管理台', '管理全站作品与展览内容。')}<div class="stats"><div class="stat"><b>${db.works.length}</b><span>全部作品</span></div><div class="stat"><b>${db.shows.length}</b><span>全部展览</span></div><div class="stat"><b>${db.apps.length}</b><span>可见投递</span></div></div><div class="sectionhead"><h3>内容管理</h3></div><div class="cards"><div class="empty">可在“作品管理”和“展览管理”中删除违规或失效内容。</div></div>`;
  const mineShows = db.shows.filter(s => s.ownerId === session.id);
  return `${header('策展人工作台','以清晰的结构，寻找独特的创作。','<button class="btn lime" onclick="showModal()">+ 创建征集</button>')}<div class="stats"><div class="stat"><b>${db.works.length}</b><span>可发现作品</span></div><div class="stat"><b>${mineShows.length}</b><span>我的征集</span></div><div class="stat"><b>${db.apps.filter(a => mineShows.some(s => s.id === a.showId)).length}</b><span>收到投递</span></div></div><div class="sectionhead"><h3>正在征集</h3><button class="btn ghost" onclick="go('shows')">我的展览 →</button></div><div class="poster-grid">${(mineShows.length ? mineShows : db.shows).slice(0, 3).map(s => poster(s, false)).join('') || '<div class="empty">暂未创建征集展览。</div>'}</div>`;
}
function works() { const mine = db.works.filter(w => w.artistId === session.id); return `${header('我的作品','建立完整的创作档案，随时参与展览征集。','<button class="btn lime" onclick="workModal()">+ 添加作品</button>')}<div class="cards">${mine.length ? mine.map(w => `<div>${artCard(w)}<button class="btn ghost" style="width:100%;margin-top:6px" onclick="viewWork('${w.id}')">查看详情</button><button class="btn ghost" style="width:100%;margin-top:6px" onclick="workModal('${w.id}')">编辑资料</button><button class="btn ghost" style="width:100%;margin-top:6px;color:#b53b2d" onclick="deleteWork('${w.id}')">删除作品</button></div>`).join('') : '<div class="empty">作品库还是空的，添加第一件作品开始吧。</div>'}</div>`; }
function calls() { const visible = db.shows.filter(s => isRecruiting(s) && !db.hiddenShows.some(h => h.showId === s.id)); return `${header('展览征集','选择与你的作品语言共振的展览。')}<div class="poster-grid">${visible.length ? visible.map(s => poster(s)).join('') : '<div class="empty">暂时没有公开征集。</div>'}</div>`; }
function workRows(list) { const admin = session.role === 'admin'; return list.length ? list.map(w => `<tr><td><button class="tiny-art" style="border:0;background:transparent;padding:0;text-align:left" onclick="viewWork('${w.id}')"><div class="swatch" style="--s:${w.color || '#dca265'}"></div><b>${esc(w.title)}</b></button></td><td>${esc(w.artistName || '匿名艺术家')}</td><td>${esc(w.artistEmail || '艺术家未公开')}</td><td>${esc(w.material)}</td><td>${esc(w.year)}</td><td>${esc(w.size)}</td><td>${esc(w.style || '—')}</td><td><span class="status">${esc(w.exhibitionStatus || '可参展')}</span></td>${admin ? `<td><button class="btn ghost" onclick="deleteWork('${w.id}')">删除</button></td>` : ''}</tr>`).join('') : `<tr><td colspan="${admin ? 9 : 8}" style="text-align:center;color:var(--muted);padding:40px">尚无艺术家作品。</td></tr>`; }
function library() { const admin = session.role === 'admin'; return `${header(admin ? '作品管理' : '作品库',admin ? '管理员可删除全站作品。' : '使用条件筛选，在创作之间建立关联。')}<div class="filters"><input id="search" oninput="filterWorks()" placeholder="搜索作品名或艺术家…"><select id="mat" onchange="filterWorks()"><option value="">所有材质</option><option>油画</option><option>丙烯</option><option>综合材料</option><option>影像</option><option>装置</option></select><select id="year" onchange="filterWorks()"><option value="">创作年份</option><option>2026</option><option>2025</option><option>2024</option></select><select id="type" onchange="filterWorks()"><option value="">作品种类</option><option>绘画</option><option>雕塑</option><option>影像</option><option>装置</option></select></div><div class="tablewrap"><table><thead><tr><th>作品</th><th>艺术家</th><th>联系邮箱</th><th>材质</th><th>年份</th><th>尺寸</th><th>风格</th><th>状态</th>${admin ? '<th>操作</th>' : ''}</tr></thead><tbody id="workrows">${workRows(db.works)}</tbody></table></div>`; }
function shows() { const admin = session.role === 'admin'; const list = admin ? db.shows : db.shows.filter(s => s.ownerId === session.id); return `${header(admin ? '展览管理' : '我的展览',admin ? '管理员可删除全站展览。' : '创建开放征集，并查看艺术家投递。', admin ? '' : '<button class="btn lime" onclick="showModal()">+ 创建征集</button>')}<div class="poster-grid">${list.length ? list.map(s => `<div>${poster(s, false)}${admin ? `<button class="btn ghost" style="width:100%;margin-top:6px" onclick="deleteShow('${s.id}')">删除展览</button>` : `<button class="btn ghost" style="width:100%;margin-top:6px" onclick="showModal('${s.id}')">编辑展览</button><button class="btn ghost" style="width:100%;margin-top:6px" onclick="viewApps('${s.id}')">查看投递（${db.apps.filter(a => a.showId === s.id).length}）</button><button class="btn ghost" style="width:100%;margin-top:6px;color:#b53b2d" onclick="deleteShow('${s.id}')">删除展览</button>`}</div>`).join('') : '<div class="empty">暂未创建征集展览。</div>'}</div>`; }
function profile() { return `${header(session.role === 'artist' ? '个人资料' : '机构资料','完整的资料会帮助对方更好地认识你。','<button class="btn lime" onclick="profileModal()">编辑资料</button>')}<div class="notice">${session.role === 'artist' ? '请补充毕业院校、个人简介和参展经历，让策展人看到更完整的创作脉络。' : '请补充机构介绍与所在城市，让艺术家准确了解征集背景。'}</div><div class="form" style="max-width:760px"><label>名称<input disabled value="${esc(session.name)}"></label><label>联系邮箱<input disabled value="${esc(session.email)}"></label><label class="wide">${session.role === 'artist' ? '毕业院校' : '机构所在地'}<input disabled value="${esc(session.school || session.city || '尚未填写')}"></label><label class="wide">${session.role === 'artist' ? '个人简介 / 参展经历' : '机构简介'}<textarea disabled>${esc(session.bio || '尚未填写')}</textarea></label></div>`; }

function render() { $('#app').innerHTML = !session ? landing() : `<div class="dash">${nav()}<main class="main">${({home, works, 'open-calls': calls, library, shows, profile})[page]()}</main></div>`; }
function openAuth(mode = 'login', role = 'artist') { authMode = mode; selectedRole = role; $('#app').innerHTML = `<div class="auth"><div class="authbox"><div class="brand">ART <em>LIAISON</em></div><h2>${mode === 'login' ? '欢迎回来' : '加入我们'}</h2><p class="sub">${mode === 'login' ? '进入你的专属艺术工作台。' : '选择身份，开启你的艺术连接。'}</p>${mode === 'register' ? `<div class="rolepick"><button class="${role === 'artist' ? 'selected' : ''}" onclick="openAuth('register','artist')">艺术家<br><small>管理作品 · 投递征集</small></button><button class="${role === 'curator' ? 'selected' : ''}" onclick="openAuth('register','curator')">策展人<br><small>筛选作品 · 创建征集</small></button></div>` : ''}<form class="authform" onsubmit="auth(event)">${mode === 'register' ? '<label>姓名 / 机构名称<input name="name" required placeholder="请输入名称"></label>' : ''}<label>邮箱<input type="email" name="email" required placeholder="name@example.com"></label><label>密码<input type="password" name="password" required minlength="6" placeholder="至少 6 位"></label><button class="btn lime">${mode === 'login' ? '登录' : '创建账号'}</button></form><div class="switch">${mode === 'login' ? '还没有账号？' : '已有账号？'} <button onclick="openAuth('${mode === 'login' ? 'register' : 'login'}')">${mode === 'login' ? '立即注册' : '返回登录'}</button><br><button style="margin-top:12px" onclick="render()">← 返回首页</button></div></div></div>`; }
function modal(title, body) { $('#app').insertAdjacentHTML('beforeend', `<div class="modal" id="modal"><div class="modalbox"><button class="close" onclick="closeModal()">×</button><h2>${title}</h2>${body}</div></div>`); }
function closeModal() { $('#modal')?.remove(); }
function showDetails(id) { const s = db.shows.find(x => x.id === id); if (!s) return; const canEdit = session.role === 'curator' && s.ownerId === session.id; modal('展览详情', `${s.posterImage ? `<img src="${esc(s.posterImage)}" alt="${esc(s.title)} 海报" style="width:100%;max-height:420px;object-fit:contain;background:#111;margin-bottom:18px">` : ''}<div class="notice"><b>${esc(s.title)}</b><br>${esc(s.description || '策展人暂未填写展览简介。')}</div><div class="form"><label>征集截止日<input disabled value="${esc(s.deadline || '待定')}"></label><label>展览时间<input disabled value="${esc(s.date || '待定')}"></label><label>展览结束日期<input disabled value="${esc(s.endDate || '待定')}"></label><label>展览地点<input disabled value="${esc(s.place || '待定')}"></label><label>主办单位<input disabled value="${esc(s.host || '待定')}"></label><label>协办单位<input disabled value="${esc(s.cohost || '未填写')}"></label><label>策展人<input disabled value="${esc(s.curator || '未填写')}"></label><label>运费情况<input disabled value="${esc(s.shipping || '可商议')}"></label></div>${canEdit ? `<div class="actions" style="margin-top:18px"><button class="btn lime" onclick="closeModal();showModal('${s.id}')">编辑展览 / 海报</button></div>` : ''}`); }
function viewWork(id) { const w = db.works.find(x => x.id === id); if (!w) return; modal('作品详情', `${w.image ? `<img src="${esc(w.image)}" alt="${esc(w.title)}" style="width:100%;max-height:360px;object-fit:cover;margin-bottom:18px">` : ''}<div class="notice"><b>${esc(w.title)}</b><br>${esc(w.description || '艺术家暂未填写作品简介。')}</div><div class="form"><label>艺术家<input disabled value="${esc(w.artistName || '未填写')}"></label><label>联系邮箱<input disabled value="${esc(w.artistEmail || '艺术家未公开')}"></label><label>作品种类<input disabled value="${esc(w.type || '未填写')}"></label><label>材质<input disabled value="${esc(w.material || '未填写')}"></label><label>创作年份<input disabled value="${esc(w.year || '未填写')}"></label><label>尺寸<input disabled value="${esc(w.size || '未填写')}"></label><label>风格<input disabled value="${esc(w.style || '未填写')}"></label><label>参展状态<input disabled value="${esc(w.exhibitionStatus || '可参展')}"></label><label>运费情况<input disabled value="${esc(w.shipping || '可商议')}"></label><label>标价<input disabled value="${esc(w.price || '未标价')}"></label><label class="wide">参加过的展览<input disabled value="${esc(w.exhibitions || '未填写')}"></label></div>`); }

async function auth(event) { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); try { if (authMode === 'register') { const created = await createUserWithEmailAndPassword(authService, data.email, data.password); await setDoc(doc(store, 'users', created.user.uid), { name: data.name, email: data.email, role: selectedRole, createdAt: serverTimestamp() }); } else { await signInWithEmailAndPassword(authService, data.email, data.password); } } catch (error) { toast(friendlyError(error)); } }
async function logout() { await signOut(authService); }
async function saveWork(event, id) { event.preventDefault(); const formData = new FormData(event.target); const imageFile = formData.get('imageFile'); const data = Object.fromEntries(formData); delete data.imageFile; try { if (imageFile?.size) data.image = await uploadImage(imageFile); const payload = {...data, artistId: session.id, artistName: session.name, artistEmail: session.email, color: colorSet[Math.floor(Math.random() * colorSet.length)], accent: '#dc6c3c', updatedAt: serverTimestamp()}; if (id) await updateDoc(doc(store, 'works', id), payload); else await addDoc(collection(store, 'works'), {...payload, createdAt: serverTimestamp()}); await loadData(); closeModal(); render(); toast('作品档案已保存'); } catch (error) { toast(uploadError(error)); } }
function workModal(id) { const w = db.works.find(x => x.id === id) || {}; modal(id ? '编辑作品' : '添加作品', `<form class="form" onsubmit="saveWork(event,'${id || ''}')"><label>作品名称<input name="title" required value="${esc(w.title)}"></label><label>作品种类<select name="type"><option>${esc(w.type || '绘画')}</option><option>雕塑</option><option>影像</option><option>装置</option></select></label><label>材质<input name="material" required value="${esc(w.material)}" placeholder="如：油画、布面"></label><label>创作年份<input name="year" required value="${esc(w.year || '2026')}" placeholder="2026"></label><label>尺寸<input name="size" required value="${esc(w.size)}" placeholder="高 × 宽 cm"></label><label>风格（选填）<input name="style" value="${esc(w.style)}" placeholder="如：抽象、具象、观念"></label><label>参展状态<select name="exhibitionStatus"><option>${esc(w.exhibitionStatus || '可参展')}</option><option>正在展览中</option><option>不可参展</option><option>可商议</option></select></label><label>运费情况<select name="shipping"><option>${esc(w.shipping || '自付运费')}</option><option>不自负运费</option><option>无需运输</option><option>可商议</option></select></label><label>标价（选填）<input name="price" value="${esc(w.price)}" placeholder="人民币 ¥"></label><label>参加过的展览（选填）<input name="exhibitions" value="${esc(w.exhibitions)}"></label><label class="wide">作品简介<textarea name="description">${esc(w.description)}</textarea></label><label class="wide">上传作品图片<input name="imageFile" type="file" accept="image/*"><small>支持 JPG、PNG 等图片，单张不超过 10MB。</small></label><label class="wide">或填写作品图片链接（选填）<input name="image" value="${esc(w.image)}" placeholder="https://…"></label><div class="actions"><button type="button" class="btn ghost" onclick="closeModal()">取消</button><button class="btn lime">保存作品</button></div></form>`); }
async function saveShow(event, id) { event.preventDefault(); const formData = new FormData(event.target); const posterFile = formData.get('posterFile'); const data = Object.fromEntries(formData); delete data.posterFile; try { if (posterFile?.size) data.posterImage = await uploadImage(posterFile); if (id) await updateDoc(doc(store, 'shows', id), {...data, updatedAt: serverTimestamp()}); else await addDoc(collection(store, 'shows'), {...data, ownerId: session.id, ownerName: session.name, accent: '#cbff4d', createdAt: serverTimestamp()}); await loadData(); closeModal(); page = 'shows'; render(); toast(id ? '展览已更新' : '征集展览已发布'); } catch (error) { toast(uploadError(error)); } }
function showModal(id) { const s = db.shows.find(x => x.id === id) || {}; modal(id ? '编辑展览' : '创建作品征集', `<form class="form" onsubmit="saveShow(event,'${id || ''}')"><label>展览主题<input name="title" required value="${esc(s.title)}" placeholder="请输入展览主题"></label><label>征集截止日<input name="deadline" required type="date" value="${esc(s.deadline)}"></label><label>展览时间<input name="date" required value="${esc(s.date)}" placeholder="2026.10.01 — 10.30"></label><label>展览结束日期<input name="endDate" required type="date" value="${esc(s.endDate)}"></label><label>展览地点<input name="place" required value="${esc(s.place)}" placeholder="城市 · 场馆"></label><label>主办单位<input name="host" required value="${esc(s.host)}"></label><label>协办单位（选填）<input name="cohost" value="${esc(s.cohost)}"></label><label>策展人（选填）<input name="curator" value="${esc(s.curator)}"></label><label>运费情况<select name="shipping"><option>${esc(s.shipping || '自付运费')}</option><option>不自负运费</option><option>可商议</option></select></label><label>海报主色<select name="poster"><option value="${esc(s.poster || '#e85134')}">当前颜色</option><option value="#e85134">朱红</option><option value="#244a61">深蓝</option><option value="#7561a8">紫罗兰</option><option value="#315b43">森林绿</option></select></label><label class="wide">上传展览海报<input name="posterFile" type="file" accept="image/*"><small>支持 JPG、PNG 等图片，单张不超过 10MB。</small></label><label class="wide">或填写海报图片链接（选填）<input name="posterImage" value="${esc(s.posterImage)}" placeholder="https://…"></label><label class="wide">展览简介（选填）<textarea name="description">${esc(s.description)}</textarea></label><div class="actions"><button class="btn lime">${id ? '保存修改' : '发布征集'}</button></div></form>`); }
function applyShow(showId) { const mine = db.works.filter(w => w.artistId === session.id); if (!mine.length) return toast('请先创建至少一件作品'); modal('投递作品', `<p class="sub">选择要投递的作品；每件作品仅可投递一次。</p><form class="form" onsubmit="sendApp(event,'${showId}')"><label class="wide">选择作品<select name="workId">${mine.map(w => `<option value="${w.id}">${esc(w.title)} · ${esc(w.year)}</option>`).join('')}</select></label><label class="wide">给策展人的留言（选填）<textarea name="note"></textarea></label><div class="actions"><button class="btn lime">确认投递</button></div></form>`); }
async function sendApp(event, showId) { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); if (db.apps.some(a => a.showId === showId && a.workId === data.workId && a.artistId === session.id)) return toast('这件作品已经投递过该展览'); try { await addDoc(collection(store, 'applications'), {...data, showId, artistId: session.id, createdAt: serverTimestamp()}); await loadData(); closeModal(); toast('投递成功，策展人将看到这件作品'); } catch (error) { toast(friendlyError(error)); } }
function viewApps(showId) { const rows = db.apps.filter(a => a.showId === showId).map(a => { const w = db.works.find(x => x.id === a.workId) || {}; return `<tr><td>${esc(w.title)}</td><td>${esc(w.artistName)}</td><td>${esc(w.material)}</td><td>${esc(w.size)}</td><td>${esc(a.note || '—')}</td></tr>`; }).join('') || '<tr><td colspan="5" style="text-align:center;padding:30px">尚未收到投递</td></tr>'; modal('作品投递', `<div class="tablewrap"><table><thead><tr><th>作品</th><th>艺术家</th><th>材质</th><th>尺寸</th><th>留言</th></tr></thead><tbody>${rows}</tbody></table></div>`); }
function profileModal() { modal('编辑资料', `<form class="form" onsubmit="saveProfile(event)"><label>名称<input name="name" required value="${esc(session.name)}"></label><label>${session.role === 'artist' ? '毕业院校' : '机构所在地'}<input name="school" value="${esc(session.school || session.city || '')}"></label><label class="wide">${session.role === 'artist' ? '个人简介与参展经历' : '机构简介'}<textarea name="bio">${esc(session.bio)}</textarea></label><div class="actions"><button class="btn lime">保存资料</button></div></form>`); }
async function saveProfile(event) { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); try { await updateDoc(doc(store, 'users', session.id), {...data, updatedAt: serverTimestamp()}); session = {...session, ...data}; closeModal(); render(); toast('资料已更新'); } catch (error) { toast(friendlyError(error)); } }
function filterWorks() { const q = $('#search').value.toLowerCase(), f = ['mat','year','type'].map(id => $('#'+id).value); $('#workrows').innerHTML = workRows(db.works.filter(w => (!q || (w.title + w.artistName).toLowerCase().includes(q)) && (!f[0] || w.material === f[0]) && (!f[1] || w.year === f[1]) && (!f[2] || w.type === f[2]))); }
async function deleteWork(id) { if (!confirm('确定删除这件作品吗？此操作无法撤销。')) return; try { await deleteDoc(doc(store, 'works', id)); await loadData(); render(); toast('作品已删除'); } catch (error) { toast(friendlyError(error)); } }
async function deleteShow(id) { if (!confirm('确定删除这个展览吗？此操作无法撤销。')) return; try { await deleteDoc(doc(store, 'shows', id)); await loadData(); render(); toast('展览已删除'); } catch (error) { toast(friendlyError(error)); } }
async function hideShow(showId) { if (!confirm('不再在你的展览征集列表中显示这个展览？')) return; try { await addDoc(collection(store, 'hiddenShows'), { showId, artistId: session.id, createdAt: serverTimestamp() }); await loadData(); render(); toast('已从你的列表隐藏该展览'); } catch (error) { toast(friendlyError(error)); } }
function go(next) { page = next; render(); }

Object.assign(window, { openAuth, auth, logout, go, workModal, saveWork, showModal, saveShow, applyShow, sendApp, viewApps, profileModal, saveProfile, filterWorks, deleteWork, deleteShow, hideShow, showDetails, viewWork, closeModal });

if (!firebaseConfig || firebaseConfig.apiKey === 'YOUR_API_KEY') {
  $('#app').innerHTML = '<div class="auth"><div class="authbox"><div class="brand">ART <em>LIAISON</em></div><h2>正在连接云端</h2><p class="sub">管理员尚未完成 Firebase 配置，请稍后刷新。</p></div></div>';
} else {
  app = initializeApp(firebaseConfig);
  authService = getAuth(app);
  store = getFirestore(app);
  onAuthStateChanged(authService, async user => {
    if (!user) { session = null; render(); return; }
    const profileDoc = await getDoc(doc(store, 'users', user.uid));
    if (!profileDoc.exists()) { await signOut(authService); toast('未找到账号资料，请重新注册。'); return; }
    session = { id: user.uid, ...profileDoc.data() };
    try { await loadData(); render(); } catch (error) { render(); toast(friendlyError(error)); }
  });
}
