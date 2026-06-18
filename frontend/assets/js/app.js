/* ═══════════════════════════════════════════════════
   RESEARCH AI — Main App JS
   File: frontend/assets/js/app.js
═══════════════════════════════════════════════════ */

const API = 'http://localhost:8000/api';

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
const State = {
  activePaperId:   null,
  activePaperName: null,
  papers:          [],
  messages:        [],
  isLoading:       false,
  selectedFile:    null,
  settings: {
    responseStyle: 'balanced',
    citations:     true,
    topK:          5,
    history:       true,
    suggestions:   true,
  },
};

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

  const token = localStorage.getItem('rai_token') || sessionStorage.getItem('rai_token');
  if (!token) {
    window.location.replace('auth.html');
    return;
  }

  try { loadSettings(); }  catch {}
  try { applySettings(); } catch {}
  try { loadUserInfo(); }  catch {}

  try { await loadPapers(); } catch {}

  try { renderHistory(); } catch {}

  try {
    const raw = localStorage.getItem('rai_last_paper');
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.id) {
        setActivePaper(p.id, p.name, p.meta);
      } else {
        localStorage.removeItem('rai_last_paper');
      }
    }
  } catch {
    localStorage.removeItem('rai_last_paper');
  }
});

/* ─────────────────────────────────────────
   TOKEN HELPERS
───────────────────────────────────────── */
function getToken() {
  return localStorage.getItem('rai_token') || sessionStorage.getItem('rai_token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

/* ─────────────────────────────────────────
   API FETCH
───────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
    });

    if (res.status === 401) {
      showToast('Session expired — please sign in again', 'error');
      throw new Error('Unauthorised');
    }

    return res;

  } catch (err) {
    if (err.message === 'Unauthorised') throw err;
    throw new Error('Cannot reach server — check backend is running');
  }
}

/* ─────────────────────────────────────────
   USER INFO
───────────────────────────────────────── */
function loadUserInfo() {
  const raw = localStorage.getItem('rai_user');
  if (!raw) return;
  try {
    const user  = JSON.parse(raw);
    const name  = user.firstName || user.displayName || user.name || user.email || '?';
    const email = user.email || '';
    const init  = name.charAt(0).toUpperCase();

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

    set('sidebarUserName',  name);
    set('sidebarUserEmail', email);
    set('sidebarAvatar',    init);

    set('profileName',  `${user.firstName||''} ${user.lastName||''}`.trim() || name);
    set('profileEmail', email);
    set('profileAvatar', init);
    setVal('profileDisplayName', user.displayName || name);

    if (user.createdAt) {
      set('profileJoined', `Joined ${new Date(user.createdAt).toLocaleDateString('en-GB',{month:'long',year:'numeric'})}`);
      const days = Math.floor((Date.now() - new Date(user.createdAt)) / 86400000);
      set('statDays', days);
    }

    set('statPapers',    user.totalPapers    || 0);
    set('statQuestions', user.totalQuestions  || 0);
  } catch {}
}

async function saveProfile() {
  const name = document.getElementById('profileDisplayName').value.trim();
  if (!name) { showToast('Enter a display name', 'info'); return; }
  try {
    const res = await apiFetch('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ displayName: name }),
    });
    if (!res.ok) throw new Error();
    const user = JSON.parse(localStorage.getItem('rai_user') || '{}');
    user.displayName = name;
    localStorage.setItem('rai_user', JSON.stringify(user));
    loadUserInfo();
    showToast('Profile saved', 'success');
  } catch { showToast('Could not save profile', 'error'); }
}

async function changePassword() {
  const current = document.getElementById('currentPassword').value;
  const next    = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmNewPassword').value;
  if (!current || !next)  { showToast('Fill in all fields', 'info'); return; }
  if (next.length < 8)    { showToast('Min 8 characters', 'error'); return; }
  if (next !== confirm)   { showToast('Passwords do not match', 'error'); return; }
  try {
    const res = await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed');
    ['currentPassword','newPassword','confirmNewPassword'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    showToast('Password updated', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

function logout() {
  localStorage.removeItem('rai_token');
  localStorage.removeItem('rai_user');
  localStorage.removeItem('rai_last_paper');
  sessionStorage.removeItem('rai_token');
  window.location.replace('auth.html');
}

/* ─────────────────────────────────────────
   PANEL SWITCHING
───────────────────────────────────────── */
const PANEL_LABELS = {
  chat:     'Chat',
  upload:   'Upload',
  library:  'Library',
  history:  'History',
  profile:  'Profile',
  settings: 'Settings',
  summary:  'Summary',
  citation: 'Citations',
  search:   'Search',
};

function switchPanel(name, btnEl) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`panel-${name}`);
  if (panel) panel.classList.add('active');

  document.querySelectorAll('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  else {
    const match = document.querySelector(`.sidebar-nav-item[data-panel="${name}"]`);
    if (match) match.classList.add('active');
  }

  const tb = document.getElementById('topbarPanel');
  if (tb) tb.textContent = PANEL_LABELS[name] || name;

  if (name === 'library') renderLibrary();
  if (name === 'history') renderHistory();
  closeSidebar();
}

/* ─────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────── */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sidebarClose')?.addEventListener('click', closeSidebar);
  document.getElementById('sidebarUploadBtn')?.addEventListener('click', () => switchPanel('upload'));
});

/* ─────────────────────────────────────────
   SETTINGS
───────────────────────────────────────── */
function loadSettings() {
  try {
    const saved = localStorage.getItem('rai_settings');
    if (saved) Object.assign(State.settings, JSON.parse(saved));
  } catch {}
}

function applySettings() {
  const s  = State.settings;
  const el = id => document.getElementById(id);
  if (el('settingResponseStyle')) el('settingResponseStyle').value = s.responseStyle;
  if (el('settingCitations'))     el('settingCitations').checked   = s.citations;
  if (el('settingTopK'))          el('settingTopK').value          = s.topK;
  if (el('settingHistory'))       el('settingHistory').checked     = s.history;
  if (el('settingSuggestions'))   el('settingSuggestions').checked = s.suggestions;
}

function saveSetting(key, value) {
  State.settings[key] = value;
  localStorage.setItem('rai_settings', JSON.stringify(State.settings));
  showToast('Setting saved', 'success');
}

/* ─────────────────────────────────────────
   PAPER LIBRARY
───────────────────────────────────────── */
async function loadPapers() {
  try {
    const res = await apiFetch('/papers');
    if (!res.ok) throw new Error('not ok');
    const data   = await res.json();
    State.papers = data.papers || data || [];
    const badge  = document.getElementById('paperCountBadge');
    if (badge) badge.textContent = State.papers.length;
    try { renderLibrary(); } catch {}
  } catch {
    State.papers = [];
    try { renderLibrary(); } catch {}
  }
}

function renderLibrary(filter = '') {
  const grid  = document.getElementById('paperGrid');
  const empty = document.getElementById('libraryEmpty');
  if (!grid) return;

  const list = filter
    ? State.papers.filter(p =>
        (p.displayName || p.filename || '').toLowerCase().includes(filter.toLowerCase()))
    : State.papers;

  if (!list.length) {
    grid.innerHTML      = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';
  grid.innerHTML = list.map(p => paperCardHTML(p)).join('');
}

function paperCardHTML(p) {
  const name   = p.displayName || cleanFilename(p.filename || 'Untitled');
  const date   = p.uploadedAt ? new Date(p.uploadedAt).toLocaleDateString('en-GB') : '';
  const chunks = p.chunkCount ? `${p.chunkCount} chunks` : '';
  const active = p.id === State.activePaperId ? 'active-paper' : '';
  return `
    <div class="paper-card ${active}" data-id="${p.id}" onclick="selectPaper('${p.id}')">
      <div class="paper-card-icon">📄</div>
      <div class="paper-card-name">${escHtml(name)}</div>
      <div class="paper-card-meta">${date}${chunks ? ' · '+chunks : ''}</div>
      <div class="paper-card-actions" onclick="event.stopPropagation()">
        <button class="paper-card-btn btn-open" onclick="selectPaper('${p.id}')">Open chat</button>
        <button class="paper-card-btn" onclick="renamePaperById('${p.id}','${escHtml(name)}')">✎</button>
        <button class="paper-card-btn btn-del" onclick="deletePaperById('${p.id}')">🗑</button>
      </div>
    </div>`;
}

function filterLibrary(val) { renderLibrary(val); }

function cleanFilename(name) {
  return name.replace(/^\d+_/, '').replace(/\.pdf$/i, '');
}

function selectPaper(id) {
  const paper = State.papers.find(p => String(p.id) === String(id));
  if (!paper) return;
  const name = paper.displayName || cleanFilename(paper.filename || 'Untitled');
  const meta = `${paper.chunkCount || 0} chunks · ready`;
  setActivePaper(paper.id, name, meta);
  switchPanel('chat');
}

function setActivePaper(id, name, meta = '') {
  State.activePaperId   = id;
  State.activePaperName = name;

  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.textContent = val; };
  const show = (elId, val) => { const el = document.getElementById(elId); if (el) el.style.display = val; };

  show('sidebarActivePaper', 'block');
  set('activePaperName', name);
  set('activePaperMeta', meta);
  set('chatPaperTitle',  name);
  set('chatPaperMeta',   meta);
  show('chatEmpty',     'none');
  show('chatInterface', 'flex');

  localStorage.setItem('rai_last_paper', JSON.stringify({ id, name, meta }));

  loadChatHistory(id);

  const showSug = State.settings.suggestions && State.messages.length === 0;
  show('suggestedQuestions', showSug ? 'block' : 'none');

  document.querySelectorAll('.paper-card').forEach(c => {
    c.classList.toggle('active-paper', String(c.dataset.id) === String(id));
  });
}

/* ─────────────────────────────────────────
   UPLOAD
───────────────────────────────────────── */
let selectedFile = null;

function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('dropZone')?.classList.add('dragover');
}

function handleDragLeave() {
  document.getElementById('dropZone')?.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone')?.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) prepareFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) prepareFile(file);
}

function prepareFile(file) {
  if (file.type !== 'application/pdf') { showToast('Only PDF files supported', 'error'); return; }
  if (file.size > 50 * 1024 * 1024)   { showToast('File exceeds 50MB limit', 'error'); return; }

  selectedFile = file;
  document.getElementById('uploadProgressWrap').style.display = 'block';
  document.getElementById('uploadFilename').textContent       = file.name;
  document.getElementById('uploadPct').textContent            = 'Ready';
  document.getElementById('uploadProgressStatus').textContent = 'Ready to process';
  document.getElementById('uploadProgressBar').style.width    = '0%';
  document.getElementById('paperNameGroup').style.display     = 'block';
  document.getElementById('paperNameInput').value             = cleanFilename(file.name);
  document.getElementById('uploadBtn').style.display          = 'block';
}

async function uploadPaper() {
  if (!selectedFile) return;

  const btn    = document.getElementById('uploadBtn');
  const bar    = document.getElementById('uploadProgressBar');
  const pct    = document.getElementById('uploadPct');
  const status = document.getElementById('uploadProgressStatus');
  const cName  = document.getElementById('paperNameInput').value.trim();

  btn.disabled = true;
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.spinner').style.display  = 'inline-block';

  const formData = new FormData();
  formData.append('file', selectedFile);
  if (cName) formData.append('displayName', cName);

  try {
    let prog = 0;
    const ticker = setInterval(() => {
      prog = Math.min(prog + Math.random() * 12, 85);
      bar.style.width    = prog + '%';
      pct.textContent    = Math.round(prog) + '%';
      status.textContent = prog < 40 ? 'Uploading…' : prog < 75 ? 'Processing…' : 'Embedding…';
    }, 300);

    const res = await fetch(`${API}/upload`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body:    formData,
    });

    clearInterval(ticker);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Upload failed');
    }

    const data = await res.json();
    bar.style.width    = '100%';
    pct.textContent    = '100%';
    status.textContent = 'Complete ✓';

    const base = selectedFile.name.replace(/\.pdf$/i, '');
    const newPaper = {
      id:          data.paperId || data.id || base,
      filename:    selectedFile.name,
      displayName: cName || cleanFilename(selectedFile.name),
      chunkCount:  data.total_chunks || data.chunkCount || 0,
      uploadedAt:  new Date().toISOString(),
    };

    State.papers.unshift(newPaper);
    const badge = document.getElementById('paperCountBadge');
    if (badge) badge.textContent = State.papers.length;
    showToast(`"${newPaper.displayName}" ready!`, 'success');

    setTimeout(() => {
      setActivePaper(newPaper.id, newPaper.displayName, `${newPaper.chunkCount} chunks · ready`);
      switchPanel('chat');
      resetUploadUI();
    }, 800);

  } catch (err) {
    showToast(err.message, 'error');
    status.textContent = 'Upload failed';
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').style.display = 'inline';
    btn.querySelector('.spinner').style.display  = 'none';
  }
}

function resetUploadUI() {
  selectedFile = null;
  const fi = document.getElementById('fileInput');
  if (fi) fi.value = '';
  document.getElementById('uploadProgressWrap').style.display = 'none';
  document.getElementById('paperNameGroup').style.display     = 'none';
  document.getElementById('uploadBtn').style.display          = 'none';
  document.getElementById('uploadProgressBar').style.width    = '0%';
}

/* ─────────────────────────────────────────
   PAPER ACTIONS
───────────────────────────────────────── */
function renamePaper() {
  if (!State.activePaperId) return;
  renamePaperById(State.activePaperId, State.activePaperName);
}

function renamePaperById(id, currentName) {
  document.getElementById('renameInput').value = currentName;
  document.getElementById('renameModal')._paperId = id;
  openModal('renameModal');
}

async function confirmRename() {
  const modal = document.getElementById('renameModal');
  const id    = modal._paperId;
  const name  = document.getElementById('renameInput').value.trim();
  if (!name) { showToast('Enter a name', 'info'); return; }
  try {
    const res = await apiFetch(`/papers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ displayName: name }),
    });
    if (!res.ok) throw new Error();
    const paper = State.papers.find(p => String(p.id) === String(id));
    if (paper) paper.displayName = name;
    if (String(State.activePaperId) === String(id)) {
      State.activePaperName = name;
      const apn = document.getElementById('activePaperName');
      const cpt = document.getElementById('chatPaperTitle');
      if (apn) apn.textContent = name;
      if (cpt) cpt.textContent = name;
    }
    renderLibrary();
    closeModal('renameModal');
    showToast('Paper renamed', 'success');
  } catch { showToast('Could not rename paper', 'error'); }
}

function deletePaper() {
  if (!State.activePaperId) return;
  deletePaperById(State.activePaperId);
}

function deletePaperById(id) {
  const paper = State.papers.find(p => String(p.id) === String(id));
  const name  = paper?.displayName || paper?.filename || 'this paper';
  openConfirm(
    'Delete paper',
    `Delete "${escHtml(name)}"? This cannot be undone.`,
    async () => {
      try {
        const res = await apiFetch(`/papers/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        State.papers = State.papers.filter(p => String(p.id) !== String(id));
        const badge = document.getElementById('paperCountBadge');
        if (badge) badge.textContent = State.papers.length;
        localStorage.removeItem(`rai_chat_${id}`);
        if (String(State.activePaperId) === String(id)) {
          State.activePaperId   = null;
          State.activePaperName = null;
          State.messages        = [];
          const sap = document.getElementById('sidebarActivePaper');
          const ce  = document.getElementById('chatEmpty');
          const ci  = document.getElementById('chatInterface');
          if (sap) sap.style.display = 'none';
          if (ce)  ce.style.display  = 'flex';
          if (ci)  ci.style.display  = 'none';
          localStorage.removeItem('rai_last_paper');
        }
        renderLibrary();
        showToast('Paper deleted', 'success');
      } catch { showToast('Could not delete paper', 'error'); }
    }
  );
}

/* ═══════════════════════════════════════════════════
   CHAT
═══════════════════════════════════════════════════ */

async function sendMessage() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const text = input.value.trim();

  if (!text)                 { showToast('Type a question first', 'info'); return; }
  if (State.isLoading)       return;
  if (!State.activePaperId)  { showToast('Select a paper first', 'info'); return; }

  const sq = document.getElementById('suggestedQuestions');
  if (sq) sq.style.display = 'none';

  appendMessage('user', text);
  input.value = '';
  autoResizeTextarea(input);

  State.isLoading = true;
  setStatus('Thinking…');
  showTyping(true);
  const sendBtn = document.getElementById('chatSendBtn');
  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({
        filename: State.activePaperId + '.pdf',
        question: text,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Something went wrong');
    }

    const data   = await res.json();
    const answer = data.answer || data.response || '';
    const sources = [];

    showTyping(false);
    appendMessage('assistant', answer, sources);
    setStatus('Ready');

    try {
      const user = JSON.parse(localStorage.getItem('rai_user') || '{}');
      user.totalQuestions = (user.totalQuestions || 0) + 1;
      localStorage.setItem('rai_user', JSON.stringify(user));
      const sq = document.getElementById('statQuestions');
      if (sq) sq.textContent = user.totalQuestions;
    } catch {}

  } catch (err) {
    showTyping(false);
    appendMessage('assistant', `Sorry — ${err.message}. Please try again.`, []);
    setStatus('Error');
    setTimeout(() => setStatus('Ready'), 3000);
  } finally {
    State.isLoading = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}

function sendSuggestion(btn) {
  const input = document.getElementById('chatInput');
  if (input) input.value = btn.textContent;
  sendMessage();
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

/* ─────────────────────────────────────────
   CHAT — Render messages
───────────────────────────────────────── */
function appendMessage(role, content, sources = []) {
  const msg = { id: Date.now(), role, content, sources, time: new Date() };
  State.messages.push(msg);
  renderMessage(msg);
  scrollChatBottom();
  saveChatHistory();
}

function renderMessage(msg) {
  const wrap = document.getElementById('chatMessages');
  if (!wrap) return;

  const time = msg.time
    ? new Date(msg.time).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
    : '';

  const sourcesHTML = (msg.sources && msg.sources.length)
    ? `<div class="message-sources">
        ${msg.sources.map(s =>
          `<span class="source-chip">${escHtml(s.section || s.page || '§')}</span>`
        ).join('')}
       </div>`
    : '';

  const copyBtn = msg.role === 'assistant'
    ? `<button class="message-copy" onclick="copyMessage(this)" title="Copy">⎘</button>`
    : '';

  const el = document.createElement('div');
  el.className  = `message ${msg.role}`;
  el.dataset.id = msg.id;
  el.innerHTML  = `
    <div class="message-bubble">
      ${copyBtn}
      ${escHtml(msg.content).replace(/\n/g, '<br>')}
    </div>
    ${sourcesHTML}
    <div class="message-time">${time}</div>`;

  wrap.appendChild(el);
}

function renderAllMessages() {
  const wrap = document.getElementById('chatMessages');
  if (!wrap) return;
  wrap.innerHTML = '';
  State.messages.forEach(m => renderMessage(m));
  scrollChatBottom();
}

function scrollChatBottom() {
  const wrap = document.getElementById('chatMessages');
  if (wrap) wrap.scrollTop = wrap.scrollHeight;
}

function copyMessage(btn) {
  const bubble = btn.closest('.message-bubble');
  const text   = bubble.innerText.replace('⎘', '').trim();
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = '⎘'; }, 2000);
  });
}

function clearChat() {
  if (!State.messages.length) return;
  openConfirm('Clear chat', 'Remove all messages from this conversation?', () => {
    State.messages = [];
    const cm = document.getElementById('chatMessages');
    if (cm) cm.innerHTML = '';
    if (State.activePaperId) localStorage.removeItem(`rai_chat_${State.activePaperId}`);
    const sq = document.getElementById('suggestedQuestions');
    if (sq) sq.style.display = State.settings.suggestions ? 'block' : 'none';
    showToast('Chat cleared', 'success');
  });
}

function showTyping(show) {
  const el = document.getElementById('typingIndicator');
  if (el) el.style.display = show ? 'flex' : 'none';
  if (show) scrollChatBottom();
}

/* ─────────────────────────────────────────
   CHAT HISTORY
───────────────────────────────────────── */
function saveChatHistory() {
  if (!State.settings.history || !State.activePaperId) return;
  const key  = `rai_chat_${State.activePaperId}`;
  const keep = State.messages.slice(-100);
  localStorage.setItem(key, JSON.stringify(keep));
}

function loadChatHistory(paperId) {
  State.messages = [];
  const raw = localStorage.getItem(`rai_chat_${paperId}`);
  if (raw) {
    try { State.messages = JSON.parse(raw); } catch {}
  }
  renderAllMessages();
}

function renderHistory() {
  const list  = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  if (!list) return;

  const items = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('rai_chat_')) continue;
    const paperId = key.replace('rai_chat_', '');
    try {
      const msgs  = JSON.parse(localStorage.getItem(key) || '[]');
      if (!msgs.length) continue;
      const paper = State.papers.find(p => p.id == paperId);
      const name  = paper?.displayName || paper?.filename || `Paper ${paperId}`;
      const last  = msgs[msgs.length - 1];
      items.push({ paperId, name, lastMsg: last.content, lastTime: last.time, count: msgs.length });
    } catch {}
  }

  if (!items.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';
  items.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));

  list.innerHTML = items.map(item => {
    const time = item.lastTime
      ? new Date(item.lastTime).toLocaleDateString('en-GB', { day:'numeric', month:'short' })
      : '';
    return `
      <div class="history-item" onclick="openHistoryItem('${item.paperId}')">
        <div class="history-icon">💬</div>
        <div class="history-item-info">
          <div class="history-paper-name">${escHtml(item.name)}</div>
          <div class="history-last-msg">${escHtml((item.lastMsg||'').slice(0,80))}…</div>
        </div>
        <div class="history-item-meta">
          ${time}<br>
          <span style="color:var(--text-xdim)">${item.count} msgs</span>
        </div>
      </div>`;
  }).join('');
}

function openHistoryItem(paperId) {
  const paper = State.papers.find(p => p.id == paperId);
  if (paper) selectPaper(paper.id);
  else showToast('Paper no longer available', 'info');
}

function clearAllHistory() {
  openConfirm('Clear all history', 'Remove all saved chat conversations from this device?', () => {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith('rai_chat_')) toRemove.push(localStorage.key(i));
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    State.messages = [];
    const cm = document.getElementById('chatMessages');
    if (cm) cm.innerHTML = '';
    renderHistory();
    showToast('History cleared', 'success');
  });
}

/* ─────────────────────────────────────────
   EXPORT
───────────────────────────────────────── */
function exportChat() {
  if (!State.messages.length) { showToast('No messages to export', 'info'); return; }
  openModal('exportModal');
}

function doExport(format) {
  closeModal('exportModal');
  const paperName = State.activePaperName || 'paper';
  const date      = new Date().toLocaleDateString('en-GB');

  if (format === 'txt') {
    let text = `=== ResearchAI Chat: ${paperName} ===\nDate: ${date}\n\n`;
    State.messages.forEach(m => {
      text += `[${m.role === 'user' ? 'You' : 'AI'}]: ${m.content}\n\n`;
    });
    downloadFile(`${slugify(paperName)}-chat.txt`, text, 'text/plain');
    showToast('Exported as .txt', 'success');
  }

  if (format === 'pdf') {
    const html = `<html><head><title>${paperName}</title>
      <style>
        body{font-family:Georgia,serif;max-width:680px;margin:40px auto;color:#111;line-height:1.7}
        h1{font-size:1.4rem}.meta{font-size:.8rem;color:#666;margin-bottom:32px}
        .msg{margin-bottom:20px}.role{font-weight:700;font-size:.75rem;text-transform:uppercase;color:#444;margin-bottom:4px}
        .user .role{color:#006400}.bubble{background:#f5f5f5;border-radius:8px;padding:12px 16px;font-size:.9rem}
        .user .bubble{background:#e8ffe8}
      </style></head><body>
      <h1>${escHtml(paperName)}</h1><div class="meta">ResearchAI · ${date}</div>
      ${State.messages.map(m=>`
        <div class="msg ${m.role}">
          <div class="role">${m.role==='user'?'You':'AI'}</div>
          <div class="bubble">${escHtml(m.content).replace(/\n/g,'<br>')}</div>
        </div>`).join('')}
      </body></html>`;
    const win = window.open('','_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(()=>{win.print();},400);
    showToast('Print dialog opened — save as PDF','info');
  }
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────
   SUMMARY
───────────────────────────────────────── */
async function getSummary() {
  if (!State.activePaperId) { showToast('Select a paper first', 'info'); return; }

  const type      = document.getElementById('summaryType').value;
  const btn       = document.getElementById('summaryBtn');
  const resultDiv = document.getElementById('summaryResult');
  const output    = document.getElementById('summaryOutput');

  btn.disabled = true;
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.spinner').style.display  = 'inline-block';
  output.textContent = 'Generating summary…';
  resultDiv.style.display = 'block';

  try {
    const res = await apiFetch('/summary', {
      method: 'POST',
      body: JSON.stringify({
        filename: State.activePaperId + '.pdf',
        summary_type: type,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to generate summary');

    const summary = data.summary;
    if (typeof summary === 'object') {
      // sectionwise returns an object — format each section
      output.textContent = Object.entries(summary)
        .map(([k, v]) => `${k.toUpperCase()}\n${v}`)
        .join('\n\n');
    } else {
      output.textContent = summary || 'No summary returned.';
    }
    showToast('Summary ready', 'success');
  } catch (e) {
    output.textContent = 'Error: ' + e.message;
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').style.display = 'inline';
    btn.querySelector('.spinner').style.display  = 'none';
  }
}

/* ─────────────────────────────────────────
   CITATION
───────────────────────────────────────── */
async function getCitation() {
  if (!State.activePaperId) { showToast('Select a paper first', 'info'); return; }

  const type      = document.getElementById('citationType').value;
  const btn       = document.getElementById('citationBtn');
  const resultDiv = document.getElementById('citationResult');
  const output    = document.getElementById('citationOutput');

  btn.disabled = true;
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.spinner').style.display  = 'inline-block';
  output.textContent = 'Extracting…';
  resultDiv.style.display = 'block';

  try {
    const res = await apiFetch('/citation', {
      method: 'POST',
      body: JSON.stringify({
        filename: State.activePaperId + '.pdf',
        extract_type: type,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Extraction failed');

    if (type === 'citations') {
      const citations = data.citations || [];
      if (!citations.length) {
        output.innerHTML = '<p style="color:var(--text-muted)">No citations found in this paper.</p>';
      } else {
        output.innerHTML = citations.map((c, i) => `
          <div style="margin-bottom:10px;padding:12px;background:var(--surface-2,#f5f5f5);border-radius:8px;font-size:13px;">
            <strong style="color:var(--text-muted);margin-right:8px;">[${i + 1}]</strong>
            ${escHtml(typeof c === 'string' ? c : JSON.stringify(c))}
          </div>`).join('');
      }
      showToast(`${citations.length} citation${citations.length !== 1 ? 's' : ''} found`, 'success');
    } else {
      output.innerHTML = `
        <div style="display:grid;gap:10px;">
          <div style="padding:12px;background:var(--surface-2,#f5f5f5);border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">TITLE</div>
            <div style="font-size:14px;">${escHtml(data.title || '—')}</div>
          </div>
          <div style="padding:12px;background:var(--surface-2,#f5f5f5);border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">AUTHORS</div>
            <div style="font-size:14px;">${escHtml(Array.isArray(data.authors) ? data.authors.join(', ') : (data.authors || '—'))}</div>
          </div>
          <div style="padding:12px;background:var(--surface-2,#f5f5f5);border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">YEAR</div>
            <div style="font-size:14px;">${escHtml(String(data.year || '—'))}</div>
          </div>
          <div style="padding:12px;background:var(--surface-2,#f5f5f5);border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">ABSTRACT</div>
            <div style="font-size:13px;line-height:1.7;">${escHtml(data.abstract || '—')}</div>
          </div>
          <div style="padding:12px;background:var(--surface-2,#f5f5f5);border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">KEYWORDS</div>
            <div style="font-size:14px;">${escHtml(Array.isArray(data.keywords) ? data.keywords.join(', ') : (data.keywords || '—'))}</div>
          </div>
        </div>`;
      showToast('Metadata extracted', 'success');
    }
  } catch (e) {
    output.textContent = 'Error: ' + e.message;
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').style.display = 'inline';
    btn.querySelector('.spinner').style.display  = 'none';
  }
}

/* ─────────────────────────────────────────
   SEMANTIC SEARCH
───────────────────────────────────────── */
async function semanticSearch() {
  if (!State.activePaperId) { showToast('Select a paper first', 'info'); return; }

  const query = document.getElementById('searchQuery').value.trim();
  if (!query) { showToast('Enter a search query', 'info'); return; }

  const topK      = parseInt(document.getElementById('searchTopK').value);
  const btn       = document.getElementById('searchBtn');
  const resultDiv = document.getElementById('searchResult');
  const output    = document.getElementById('searchOutput');

  btn.disabled = true;
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.spinner').style.display  = 'inline-block';
  output.textContent = 'Searching…';
  resultDiv.style.display = 'block';

  try {
    const res = await apiFetch('/search', {
      method: 'POST',
      body: JSON.stringify({
        filename: State.activePaperId + '.pdf',
        query:    query,
        top_k:    topK,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Search failed');

    const results = data.results || [];
    if (!results.length) {
      output.innerHTML = '<p style="color:var(--text-muted)">No results found for your query.</p>';
    } else {
      output.innerHTML = results.map(r => `
        <div style="margin-bottom:14px;padding:14px;background:var(--surface-2,#f5f5f5);border-radius:8px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);">RANK ${r.rank}</span>
            <span style="font-size:11px;color:var(--text-muted);">Score: ${(r.relevance_score || 0).toFixed(3)}</span>
          </div>
          <div style="font-size:13px;line-height:1.7;">${escHtml(r.text || r.content || JSON.stringify(r))}</div>
        </div>`).join('');
    }
    showToast(`${data.total_results} result${data.total_results !== 1 ? 's' : ''} found`, 'success');
  } catch (e) {
    output.textContent = 'Error: ' + e.message;
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').style.display = 'inline';
    btn.querySelector('.spinner').style.display  = 'none';
  }
}

/* ─────────────────────────────────────────
   DELETE ACCOUNT
───────────────────────────────────────── */
function confirmDeleteAccount() {
  openConfirm(
    'Delete account',
    'Permanently delete your account and all uploaded papers. This cannot be undone.',
    async () => {
      try {
        const res = await apiFetch('/auth/account', { method: 'DELETE' });
        if (!res.ok) throw new Error();
        logout();
      } catch { showToast('Could not delete account. Contact support.', 'error'); }
    }
  );
}

/* ─────────────────────────────────────────
   MODALS
───────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function openConfirm(title, text, onConfirm) {
  const t = document.getElementById('confirmTitle');
  const b = document.getElementById('confirmText');
  const btn = document.getElementById('confirmActionBtn');
  if (t) t.textContent = title;
  if (b) b.textContent = text;
  if (btn) btn.onclick = () => { closeModal('confirmModal'); onConfirm(); };
  openModal('confirmModal');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.style.display = 'none';
    });
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
  }
});

/* ─────────────────────────────────────────
   STATUS BAR
───────────────────────────────────────── */
function setStatus(text) {
  const el = document.getElementById('topbarStatusText');
  if (el) el.textContent = text;
}

/* ─────────────────────────────────────────
   TOAST STACK
───────────────────────────────────────── */
function showToast(message, type = 'info') {
  const stack = document.getElementById('toastStack');
  if (!stack) return;

  const icons = { success: '✓', error: '✕', info: '→' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '·'} ${escHtml(message)}</span>`;

  stack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  const all = stack.querySelectorAll('.toast');
  if (all.length > 5) all[0].remove();

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

/* ─────────────────────────────────────────
   UTILS
───────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}