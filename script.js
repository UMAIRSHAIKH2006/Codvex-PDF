/* ══════════════════════════════════════════════
   CODVEX PDF TOOLS — REDESIGNED SCRIPT
   Auth system + file handling + processing
══════════════════════════════════════════════ */

/* ══════════════════
   TOOL METADATA
══════════════════ */
const toolMeta = {
  merge: {
    emoji: '📎',
    tag: 'Merge PDF',
    title: 'Combine your PDFs into one',
    desc: 'Add two or more PDF files below and we\'ll stitch them together into a single document — instantly.',
    btn: '🔀 Merge My Files',
    out: 'merged_document.pdf',
  },
  split: {
    emoji: '✂️',
    tag: 'Split PDF',
    title: 'Pull out specific pages',
    desc: 'Add your PDF and we\'ll split it into separate pages or sections — you choose what you need.',
    btn: '✂️ Split My PDF',
    out: 'split_result.zip',
  },
  compress: {
    emoji: '🪄',
    tag: 'Make PDF Smaller',
    title: 'Shrink your PDF file',
    desc: 'Got a large PDF that\'s hard to email or share? We\'ll make it smaller without losing quality.',
    btn: '🪄 Compress My PDF',
    out: 'compressed_document.pdf',
  },
  pdfword: {
    emoji: '📝',
    tag: 'PDF → Word',
    title: 'Turn your PDF into a Word file',
    desc: 'Add your PDF and get back a .docx file you can open and edit in Microsoft Word or Google Docs.',
    btn: '📝 Convert to Word',
    out: 'converted_document.docx',
  },
  jpgpdf: {
    emoji: '🖼️',
    tag: 'Photos → PDF',
    title: 'Turn your photos into a PDF',
    desc: 'Add your JPG or PNG images below and we\'ll combine them into one clean, professional PDF.',
    btn: '🖼️ Create My PDF',
    out: 'images_document.pdf',
  },
};

/* Friendly processing messages — no jargon */
const processingSteps = [
  'Getting your file ready…',
  'Working on your file…',
  'Almost halfway there…',
  'Putting things together…',
  'Almost done…',
  'Finishing up…',
];

let currentTool = 'merge';
let selectedFiles = [];

/* ══════════════════════════════
   AUTH SYSTEM (localStorage mock)
══════════════════════════════ */
const AUTH_KEY = 'codvex_user';
const USERS_KEY = 'codvex_users';
const TASKS_KEY = 'codvex_tasks';

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; } catch { return {}; }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
}

function setCurrentUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem(AUTH_KEY);
}

/* Task usage tracking (guest: 3/hr, user: unlimited) */
function getTaskCount() {
  try {
    const data = JSON.parse(localStorage.getItem(TASKS_KEY));
    if (!data) return { count: 0, hour: getCurrentHour() };
    if (data.hour !== getCurrentHour()) return { count: 0, hour: getCurrentHour() };
    return data;
  } catch { return { count: 0, hour: getCurrentHour() }; }
}

function incrementTaskCount() {
  const data = getTaskCount();
  data.count++;
  localStorage.setItem(TASKS_KEY, JSON.stringify(data));
}

function getCurrentHour() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
}

function tasksRemaining() {
  const user = getCurrentUser();
  if (user) return Infinity; // logged-in users get unlimited
  const data = getTaskCount();
  return Math.max(0, 3 - data.count);
}

/* Auth UI */
function openAuth(tab = 'login') {
  document.getElementById('auth-overlay').classList.remove('hidden');
  switchTab(tab);
  document.body.style.overflow = 'hidden';
}

function closeAuth() {
  document.getElementById('auth-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  clearAuthErrors();
}

function switchTab(tab) {
  document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('form-signup').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  clearAuthErrors();
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearAuthErrors() {
  ['login-error', 'signup-error'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = '';
    el.classList.add('hidden');
  });
}

function doLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showAuthError('login-error', 'Please fill in both fields.');
    return;
  }
  if (!isValidEmail(email)) {
    showAuthError('login-error', 'That doesn\'t look like a valid email address.');
    return;
  }

  const users = getUsers();
  const user  = users[email.toLowerCase()];

  if (!user) {
    showAuthError('login-error', 'No account found with that email. Create one below!');
    return;
  }
  if (user.password !== hashPassword(password)) {
    showAuthError('login-error', 'Incorrect password. Please try again.');
    return;
  }

  setCurrentUser({ email: user.email, name: user.name });
  onAuthSuccess();
}

function doSignup() {
  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!name || !email || !password) {
    showAuthError('signup-error', 'Please fill in all fields.');
    return;
  }
  if (!isValidEmail(email)) {
    showAuthError('signup-error', 'That doesn\'t look like a valid email address.');
    return;
  }
  if (password.length < 6) {
    showAuthError('signup-error', 'Password must be at least 6 characters long.');
    return;
  }

  const users = getUsers();
  if (users[email.toLowerCase()]) {
    showAuthError('signup-error', 'An account with that email already exists. Try logging in!');
    return;
  }

  users[email.toLowerCase()] = { name, email, password: hashPassword(password) };
  saveUsers(users);
  setCurrentUser({ email, name });
  onAuthSuccess();
}

function doLogout() {
  clearCurrentUser();
  updateNavAuth();
  updateUsageUI();
}

function forgotPassword() {
  alert('Password reset coming soon! For now, try to remember — or create a new account with a different email 😊');
}

function onAuthSuccess() {
  closeAuth();
  updateNavAuth();
  updateUsageUI();
  // clear auth fields
  ['login-email','login-password','signup-name','signup-email','signup-password']
    .forEach(id => { document.getElementById(id).value = ''; });
}

function updateNavAuth() {
  const user = getCurrentUser();
  document.getElementById('nav-guest').classList.toggle('hidden', !!user);
  document.getElementById('nav-user').classList.toggle('hidden', !user);
  document.getElementById('mobile-guest').classList.toggle('hidden', !!user);
  document.getElementById('mobile-user').classList.toggle('hidden', !user);

  if (user) {
    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : 'U';
    document.getElementById('nav-avatar').textContent   = initials;
    document.getElementById('nav-username').textContent = user.name || user.email;
    document.getElementById('mobile-username').textContent = `Hi, ${user.name || 'there'}!`;
  }
}

function updateUsageUI() {
  const user    = getCurrentUser();
  const left    = tasksRemaining();
  const guestEl = document.getElementById('usage-notice-home');
  const barEl   = document.getElementById('usage-bar');

  if (user) {
    if (guestEl) guestEl.style.display = 'none';
    if (barEl)   barEl.style.display   = 'none';
  } else {
    if (guestEl) guestEl.style.display = '';
    if (barEl) {
      barEl.style.display = '';
      document.getElementById('tasks-left').textContent = left;
    }
  }
}

/* Simple email check */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* Minimal password hash (not secure — demo only) */
function hashPassword(pw) {
  let hash = 0;
  for (let i = 0; i < pw.length; i++) {
    hash = ((hash << 5) - hash) + pw.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

/* Close auth overlay on background click */
document.getElementById('auth-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeAuth();
});

/* Close auth on Escape */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAuth();
});

/* ══════════════════
   PAGE ROUTING
══════════════════ */
function showHome() {
  document.getElementById('home-page').style.display = 'block';
  document.getElementById('tool-page').classList.add('hidden');
  clearFiles();
  updateUsageUI();
}

function openTool(tool) {
  currentTool = tool;
  const meta  = toolMeta[tool];

  document.getElementById('tool-emoji').textContent      = meta.emoji;
  document.getElementById('tool-tag').textContent        = meta.tag;
  document.getElementById('tool-title').textContent      = meta.title;
  document.getElementById('tool-desc').textContent       = meta.desc;
  document.getElementById('process-btn-text').textContent = meta.btn;

  document.getElementById('home-page').style.display = 'none';
  document.getElementById('tool-page').classList.remove('hidden');

  clearFiles();
  updateUsageUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════
   MOBILE NAV
══════════════════ */
function toggleMobileNav() {
  document.getElementById('mobile-nav').classList.toggle('hidden');
}
function closeMobileNav() {
  document.getElementById('mobile-nav').classList.add('hidden');
}

/* ══════════════════
   FILE HANDLING
══════════════════ */
function triggerFileInput() {
  document.getElementById('file-input').click();
}

function handleFiles(files) {
  for (const f of files) selectedFiles.push(f);
  renderFileList();
}

function renderFileList() {
  const list   = document.getElementById('file-list');
  const bar    = document.getElementById('action-bar');

  list.innerHTML = '';

  selectedFiles.forEach((f, i) => {
    const kb   = f.size / 1024;
    const size = kb < 1024 ? kb.toFixed(1) + ' KB' : (kb / 1024).toFixed(2) + ' MB';
    const ext  = f.name.split('.').pop().toUpperCase();

    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <div class="file-item-left">
        <div class="file-item-icon">📄</div>
        <div>
          <div class="file-item-name">${escapeHtml(f.name)}</div>
          <div class="file-item-size">${ext} · ${size}</div>
        </div>
      </div>
      <button class="file-remove" onclick="removeFile(${i})" title="Remove this file">✕</button>
    `;
    list.appendChild(item);
  });

  bar.style.display = selectedFiles.length ? 'flex' : 'none';
  document.getElementById('file-count-label').textContent =
    selectedFiles.length === 1 ? '1 file added' : `${selectedFiles.length} files added`;

  // Reset result UI
  document.getElementById('progress-wrap').classList.add('hidden');
  document.getElementById('success-wrap').classList.add('hidden');
}

function removeFile(i) {
  selectedFiles.splice(i, 1);
  renderFileList();
}

function clearFiles() {
  selectedFiles = [];
  document.getElementById('file-list').innerHTML = '';
  document.getElementById('action-bar').style.display = 'none';
  document.getElementById('progress-wrap').classList.add('hidden');
  document.getElementById('success-wrap').classList.add('hidden');
  const inp = document.getElementById('file-input');
  if (inp) inp.value = '';
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ══════════════════
   DRAG & DROP
══════════════════ */
(function setupDragDrop() {
  const zone = document.getElementById('upload-area');
  if (!zone) return;

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
})();

/* ══════════════════
   PROCESSING
══════════════════ */
function startProcessing() {
  if (!selectedFiles.length) {
    alert('Please add at least one file first.');
    return;
  }

  /* Check guest usage limit */
  if (!getCurrentUser()) {
    const left = tasksRemaining();
    if (left <= 0) {
      openAuth('signup');
      return;
    }
    incrementTaskCount();
    updateUsageUI();
  }

  const btn    = document.getElementById('process-btn');
  const pw     = document.getElementById('progress-wrap');
  const fill   = document.getElementById('progress-fill');
  const pct    = document.getElementById('progress-pct');
  const step   = document.getElementById('progress-step');
  const status = document.getElementById('progress-status');
  const sw     = document.getElementById('success-wrap');

  btn.disabled     = true;
  btn.style.opacity = '0.5';

  pw.classList.remove('hidden');
  sw.classList.add('hidden');

  fill.style.width = '0%';
  pct.textContent  = '0%';
  status.textContent = 'Working on your file…';

  let progress = 0;
  let stepIdx  = 0;
  step.textContent = processingSteps[0];

  const interval = setInterval(() => {
    const speed = progress < 55 ? 2.4 : progress < 80 ? 1.3 : 0.5;
    progress = Math.min(progress + speed, 100);
    fill.style.width = progress + '%';
    pct.textContent  = Math.floor(progress) + '%';

    const idx = Math.min(
      Math.floor((progress / 100) * processingSteps.length),
      processingSteps.length - 1
    );
    if (idx !== stepIdx) {
      stepIdx = idx;
      step.textContent = processingSteps[stepIdx];
    }

    if (progress >= 100) {
      clearInterval(interval);
      status.textContent = 'All done! ✓';
      step.textContent   = 'Your file is ready to download.';

      setTimeout(() => {
        pw.classList.add('hidden');
        showSuccess();
        btn.disabled      = false;
        btn.style.opacity = '1';
      }, 500);
    }
  }, 60);
}

function showSuccess() {
  const sw   = document.getElementById('success-wrap');
  const meta = toolMeta[currentTool];
  const totalMB = (selectedFiles.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(2);

  document.getElementById('success-sub').textContent =
    `${meta.out} · ${totalMB} MB · Ready for you`;

  sw.classList.remove('hidden');
  sw.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function simulateDownload() {
  const meta    = toolMeta[currentTool];
  const content = `%PDF-1.4 — Demo file generated by Codvex PDF Tools\n\nTool: ${meta.title}\nFiles: ${selectedFiles.length}`;
  const blob    = new Blob([content], { type: 'application/pdf' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = meta.out;
  a.click();
  URL.revokeObjectURL(url);
}

/* ══════════════════
   INIT
══════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
  updateUsageUI();
});