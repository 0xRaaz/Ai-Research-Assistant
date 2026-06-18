/* ═══════════════════════════════════════════════════
   RESEARCH AI — Auth Page JS
   File: frontend/assets/js/auth.js
   Handles: Login, Register, JWT storage,
            tab switching, validation, password strength
═══════════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   CONFIG
───────────────────────────────────────── */
const API_BASE = 'http://localhost:8000/api'; // Change to your backend URL

/* ─────────────────────────────────────────
   ON LOAD — Check URL params + existing token
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  // Only run auth page logic if we are actually on auth.html
  // auth.js is also loaded by index.html — skip everything there
  const onAuthPage = !!document.getElementById('loginForm');
  if (!onAuthPage) return;

  // Redirect if already logged in
  const token = getToken();
  if (token) {
    window.location.replace('index.html');
    return;
  }

  // Check URL param ?mode=register
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'register') {
    switchTab('register');
  }

  // Wire up form submissions
  document.getElementById('loginForm')   ?.addEventListener('submit', handleLogin);
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);

  // Real-time email validation
  document.getElementById('loginEmail')  ?.addEventListener('blur', () => validateEmail('loginEmail',    'loginEmailError'));
  document.getElementById('regEmail')    ?.addEventListener('blur', () => validateEmail('regEmail',       'regEmailError'));
  document.getElementById('regConfirmPassword')?.addEventListener('input', validateConfirmPassword);
});


/* ─────────────────────────────────────────
   TAB SWITCHER
───────────────────────────────────────── */
function switchTab(tab) {
  const loginPanel    = document.getElementById('panel-login');
  const registerPanel = document.getElementById('panel-register');
  const loginTab      = document.getElementById('tab-login');
  const registerTab   = document.getElementById('tab-register');
  const title         = document.getElementById('authTitle');
  const sub           = document.getElementById('authSub');

  if (tab === 'login') {
    loginPanel.classList.add('active');
    registerPanel.classList.remove('active');
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginTab.setAttribute('aria-selected', 'true');
    registerTab.setAttribute('aria-selected', 'false');
    title.textContent = 'Sign in to ResearchAI';
    sub.textContent   = 'Upload papers, ask questions, get cited answers.';
    // Update URL without reload
    history.replaceState(null, '', 'auth.html');
  } else {
    registerPanel.classList.add('active');
    loginPanel.classList.remove('active');
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerTab.setAttribute('aria-selected', 'true');
    loginTab.setAttribute('aria-selected', 'false');
    title.textContent = 'Create your account';
    sub.textContent   = 'Free to start — no credit card required.';
    history.replaceState(null, '', 'auth.html?mode=register');
  }

  // Clear all errors on switch
  clearAllErrors();
}


/* ─────────────────────────────────────────
   LOGIN
───────────────────────────────────────── */
async function handleLogin(e) {
  e.preventDefault();

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const remember = document.getElementById('rememberMe').checked;

  // Validate
  let valid = true;
  if (!isValidEmail(email)) {
    showFieldError('loginEmailError');
    document.getElementById('loginEmail').classList.add('error');
    valid = false;
  }
  if (!password) {
    showFieldError('loginPasswordError');
    document.getElementById('loginPassword').classList.add('error');
    valid = false;
  }
  if (!valid) return;

  // Loading state
  setLoading('loginBtn', true);

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe: remember }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || data.message || 'Invalid email or password');
    }

    // Handle multiple possible token field names from backend
    const token = data.access_token || data.token || data.accessToken || data.jwt;
    if (!token) {
      throw new Error('No token received from server');
    }

    // Store token
    storeToken(token, remember);

    // Store user info — handle nested or flat response
    const user = data.user || data.userData || {
      email,
      firstName: data.firstName || data.first_name || '',
      lastName:  data.lastName  || data.last_name  || '',
    };
    localStorage.setItem('rai_user', JSON.stringify(user));

    showToast('Welcome back! Redirecting…', 'success');

    // Force redirect — use replace so back button goes to landing not auth
    setTimeout(() => {
      window.location.replace('index.html');
    }, 800);

  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('loginEmail').classList.add('error');
    document.getElementById('loginPassword').classList.add('error');
  } finally {
    setLoading('loginBtn', false);
  }
}


/* ─────────────────────────────────────────
   REGISTER
───────────────────────────────────────── */
async function handleRegister(e) {
  e.preventDefault();

  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName  = document.getElementById('regLastName').value.trim();
  const email     = document.getElementById('regEmail').value.trim();
  const password  = document.getElementById('regPassword').value;
  const confirm   = document.getElementById('regConfirmPassword').value;

  // Validate
  let valid = true;

  if (!firstName) {
    showFieldError('regFirstNameError');
    document.getElementById('regFirstName').classList.add('error');
    valid = false;
  }

  if (!isValidEmail(email)) {
    showFieldError('regEmailError');
    document.getElementById('regEmail').classList.add('error');
    valid = false;
  }

  if (password.length < 8) {
    showFieldError('regPasswordError');
    document.getElementById('regPassword').classList.add('error');
    valid = false;
  }

  if (password !== confirm) {
    showFieldError('regConfirmError');
    document.getElementById('regConfirmPassword').classList.add('error');
    valid = false;
  }

  if (!valid) return;

  setLoading('registerBtn', true);

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || data.message || 'Registration failed. Try a different email.');
    }

    // Auto-login after register
    const regToken = data.access_token || data.token || data.accessToken || data.jwt;
    if (!regToken) throw new Error('No token received from server');
    storeToken(regToken, false);

    const regUser = data.user || data.userData || { email, firstName, lastName };
    localStorage.setItem('rai_user', JSON.stringify(regUser));

    showToast('Account created! Setting things up…', 'success');
    setTimeout(() => { window.location.replace('index.html'); }, 800);

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading('registerBtn', false);
  }
}


/* ─────────────────────────────────────────
   OAUTH (placeholder — wire to backend)
───────────────────────────────────────── */
function oauthLogin(provider) {
  showToast(`${provider} sign-in coming soon`, 'info');
  // When ready:
  // window.location.href = `${API_BASE}/auth/${provider}`;
}


/* ─────────────────────────────────────────
   FORGOT PASSWORD
───────────────────────────────────────── */
function showForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();

  if (!email || !isValidEmail(email)) {
    showToast('Enter your email address first', 'info');
    document.getElementById('loginEmail').focus();
    return;
  }

  // Send reset email
  fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  .then(() => {
    showToast(`Password reset sent to ${email}`, 'success');
  })
  .catch(() => {
    showToast('Could not send reset email. Try again.', 'error');
  });
}


/* ─────────────────────────────────────────
   PASSWORD UTILITIES
───────────────────────────────────────── */
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
    btn.setAttribute('aria-label', 'Hide password');
  } else {
    input.type = 'password';
    btn.textContent = '👁';
    btn.setAttribute('aria-label', 'Show password');
  }
}

function checkPasswordStrength(value) {
  const meter  = document.getElementById('passwordStrength');
  const bar    = document.getElementById('strengthBar');
  const label  = document.getElementById('strengthLabel');
  if (!meter) return;

  if (!value) {
    meter.classList.remove('show');
    return;
  }

  meter.classList.add('show');

  let score = 0;
  if (value.length >= 8)  score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value))  score++;
  if (/[0-9]/.test(value))  score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  bar.className = 'strength-bar-fill';
  label.className = 'strength-label';

  if (score <= 2) {
    bar.classList.add('weak');
    label.classList.add('weak');
    label.textContent = 'Weak';
  } else if (score <= 3) {
    bar.classList.add('medium');
    label.classList.add('medium');
    label.textContent = 'Medium';
  } else {
    bar.classList.add('strong');
    label.classList.add('strong');
    label.textContent = 'Strong';
  }
}

function validateConfirmPassword() {
  const pass    = document.getElementById('regPassword')?.value;
  const confirm = document.getElementById('regConfirmPassword');
  if (!confirm) return;

  if (confirm.value && confirm.value !== pass) {
    confirm.classList.add('error');
    showFieldError('regConfirmError');
  } else {
    confirm.classList.remove('error');
    hideFieldError('regConfirmError');
    if (confirm.value) confirm.classList.add('success');
  }
}


/* ─────────────────────────────────────────
   JWT STORAGE
───────────────────────────────────────── */
function storeToken(token, remember) {
  if (remember) {
    localStorage.setItem('rai_token', token);
    sessionStorage.removeItem('rai_token');
  } else {
    sessionStorage.setItem('rai_token', token);
    localStorage.removeItem('rai_token');
  }
}

function getToken() {
  return localStorage.getItem('rai_token') || sessionStorage.getItem('rai_token');
}

function removeToken() {
  localStorage.removeItem('rai_token');
  sessionStorage.removeItem('rai_token');
  localStorage.removeItem('rai_user');
}

function isTokenValid(token) {
  if (!token) return false;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded  = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    const payload = JSON.parse(atob(padded));
    if (!payload.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch { return true; }
}


/* ─────────────────────────────────────────
   SESSION EXPIRY HANDLER
   Call this from app.js on every 401 response
───────────────────────────────────────── */
function handleSessionExpired() {
  removeToken();
  showToast('Session expired — please sign in again', 'error');
  setTimeout(() => {
    window.location.href = 'auth.html';
  }, 1800);
}

// Expose globally for app.js to call
window.handleSessionExpired = handleSessionExpired;
window.getToken = getToken;
window.removeToken = removeToken;
window.isTokenValid = isTokenValid;


/* ─────────────────────────────────────────
   FORM HELPERS
───────────────────────────────────────── */
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
}

function showFieldError(id) {
  document.getElementById(id)?.classList.add('show');
}

function hideFieldError(id) {
  document.getElementById(id)?.classList.remove('show');
}

function clearAllErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('show'));
  document.querySelectorAll('.form-input').forEach(el => {
    el.classList.remove('error', 'success');
  });
}

function validateEmail(inputId, errorId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (!isValidEmail(input.value.trim())) {
    input.classList.add('error');
    showFieldError(errorId);
  } else {
    input.classList.remove('error');
    input.classList.add('success');
    hideFieldError(errorId);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


/* ─────────────────────────────────────────
   TOAST (matches style.css .toast)
───────────────────────────────────────── */
let toastTimer = null;

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  // Icons per type
  const icons = { success: '✓', error: '✕', info: '→' };
  toast.innerHTML = `<span>${icons[type] || '·'} ${message}</span>`;
  toast.className = `toast ${type} show`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}