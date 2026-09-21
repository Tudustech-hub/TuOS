function updateClock() {
  const clockEl = document.getElementById('clock');
  if (clockEl) {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
setInterval(updateClock, 1000);
updateClock();

let highestZ = 100;
function bringToFront(win) {
  highestZ++;
  win.style.zIndex = highestZ;
}

function openWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;

  const wrapper = document.querySelector(`.dock-wrapper[data-app="${id}"]`);
  if (wrapper) {
    wrapper.classList.remove('bouncing');
    void wrapper.offsetWidth;
    wrapper.classList.add('bouncing');
    setTimeout(() => wrapper.classList.remove('bouncing'), 750);
  }

  bringToFront(win);
  win.classList.remove('closing-window', 'minimizing-window');
  win.classList.add('active-window');

  const dot = document.getElementById('dot-' + id);
  if (dot) dot.classList.add('active');
}

function closeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;

  win.classList.remove('active-window');
  win.classList.add('closing-window');

  const dot = document.getElementById('dot-' + id);
  if (dot) dot.classList.remove('active');

  setTimeout(() => {
    if (win.classList.contains('closing-window')) {
      win.classList.remove('closing-window');
      win.style.display = 'none';
    }
  }, 220);
}

function minimizeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;

  win.classList.remove('active-window');
  win.classList.add('minimizing-window');

  setTimeout(() => {
    if (win.classList.contains('minimizing-window')) {
      win.style.display = 'none';
      win.classList.remove('minimizing-window');
    }
  }, 300);
}

function toggleWindow(id) {
  const win = document.getElementById(id);
  if (win && win.classList.contains('active-window') && win.style.display !== 'none') {
    minimizeWindow(id);
  } else {
    openWindow(id);
  }
}

function toggleMaximize(id) {
  const win = document.getElementById(id);
  if (!win) return;
  win.classList.toggle('maximized');
  bringToFront(win);
}

function toggleLaunchpad() {
  const lp = document.getElementById('launchpad-overlay');
  const dot = document.getElementById('dot-launchpad');
  if (!lp) return;

  if (lp.style.display === 'flex') {
    lp.classList.remove('active-lp');
    if (dot) dot.classList.remove('active');
    setTimeout(() => { lp.style.display = 'none'; }, 250);
  } else {
    lp.style.display = 'flex';
    void lp.offsetWidth;
    lp.classList.add('active-lp');
    if (dot) dot.classList.add('active');
  }
}

const dock = document.getElementById('macos-dock');
const dockItems = document.querySelectorAll('.dock-item');
const BASE_SIZE = 48;
const MAX_SCALE = 1.45;
const MAX_DISTANCE = 110;

if (dock) {
  dock.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;
    dockItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const itemCenterX = rect.left + rect.width / 2;
      const distance = Math.abs(mouseX - itemCenterX);

      if (distance < MAX_DISTANCE) {
        const scale = 1 + (MAX_SCALE - 1) * Math.cos((distance / MAX_DISTANCE) * (Math.PI / 2));
        const targetSize = BASE_SIZE * scale;
        item.style.width = `${targetSize}px`;
        item.style.height = `${targetSize}px`;
      } else {
        item.style.width = `${BASE_SIZE}px`;
        item.style.height = `${BASE_SIZE}px`;
      }
    });
  });

  dock.addEventListener('mouseleave', () => {
    dockItems.forEach((item) => {
      item.style.width = `${BASE_SIZE}px`;
      item.style.height = `${BASE_SIZE}px`;
    });
  });
}

document.querySelectorAll('.window').forEach(windowEl => {
  const header = windowEl.querySelector('.window-header');
  if (!header) return;

  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;

  windowEl.addEventListener('mousedown', () => bringToFront(windowEl));
  windowEl.addEventListener('touchstart', () => bringToFront(windowEl), { passive: true });

  const startDrag = (clientX, clientY) => {
    isDragging = true;
    bringToFront(windowEl);
    startX = clientX;
    startY = clientY;
    initialLeft = windowEl.offsetLeft;
    initialTop = windowEl.offsetTop;
    windowEl.style.transition = 'none';
  };

  const moveDrag = (clientX, clientY) => {
    if (!isDragging) return;
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    const newTop = Math.max(28, initialTop + deltaY);
    const newLeft = initialLeft + deltaX;

    windowEl.style.left = `${newLeft}px`;
    windowEl.style.top = `${newTop}px`;
  };

  const stopDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    windowEl.style.transition = '';
  };

  header.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('dot')) return;
    if (windowEl.classList.contains('maximized')) return;
    startDrag(e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
  document.addEventListener('mouseup', stopDrag);

  header.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('dot')) return;
    if (windowEl.classList.contains('maximized')) return;
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  }, { passive: true });

  document.addEventListener('touchend', stopDrag);
});

const notesArea = document.getElementById('notes-textarea');
if (notesArea) {
  notesArea.value = localStorage.getItem('tuos_saved_notes') || '';
  notesArea.addEventListener('input', (e) => {
    localStorage.setItem('tuos_saved_notes', e.target.value);
  });
}

const calcDisplay = document.getElementById('calc-display');

function appendCalc(val) {
  if (!calcDisplay) return;
  if (calcDisplay.value === '0' && val !== '.') {
    calcDisplay.value = val;
  } else {
    calcDisplay.value += val;
  }
}

function clearCalc() {
  if (calcDisplay) calcDisplay.value = '0';
}

function deleteCalc() {
  if (!calcDisplay) return;
  calcDisplay.value = calcDisplay.value.slice(0, -1);
  if (!calcDisplay.value) calcDisplay.value = '0';
}

function calculateResult() {
  if (!calcDisplay) return;
  try {
    calcDisplay.value = Function('"use strict"; return (' + calcDisplay.value + ')')();
  } catch (err) {
    calcDisplay.value = 'Error';
  }
}

window.addEventListener('keydown', (e) => {
  const calcWin = document.getElementById('calc-window');
  if (!calcWin || calcWin.style.display === 'none' || !calcWin.classList.contains('active-window')) return;
  if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') return;

  if (e.key >= '0' && e.key <= '9') appendCalc(e.key);
  if (['+', '-', '*', '/'].includes(e.key)) appendCalc(e.key);
  if (e.key === '.' || e.key === ',') appendCalc('.');
  if (e.key === 'Enter') calculateResult();
  if (e.key === 'Backspace') deleteCalc();
  if (e.key.toLowerCase() === 'c') clearCalc();
});

function toggleDropdown(id) {
  const el = document.getElementById(id);
  const isOpen = el.style.display === 'block' || el.style.display === 'flex';
  closeAllDropdowns();
  if (!isOpen) {
    el.style.display = (id === 'control-center-dropdown') ? 'flex' : 'block';
  }
}

function closeAllDropdowns() {
  document.getElementById('apple-dropdown').style.display = 'none';
  document.getElementById('control-center-dropdown').style.display = 'none';
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.apple-logo') && 
      !e.target.closest('#apple-dropdown') &&
      !e.target.closest('.menu-icon') &&
      !e.target.closest('#control-center-dropdown')) {
    closeAllDropdowns();
  }
});

function adjustBrightness(val) {
  document.documentElement.style.setProperty('--brightness', val / 100);
}

function updateLockClock() {
  const now = new Date();
  const timeEl = document.getElementById('lock-time');
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  const dateEl = document.getElementById('lock-date');
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }
}
setInterval(updateLockClock, 1000);
updateLockClock();

function unlockScreen(e) {
  if (e) e.preventDefault();
  const lock = document.getElementById('lock-screen');
  const passInput = document.getElementById('lock-pass');
  const savedPassword = localStorage.getItem('tuos_password') || '';

  if (savedPassword && passInput.value !== savedPassword) {
    passInput.classList.add('shake');
    document.getElementById('lock-hint-msg').textContent = 'Incorrect password. Try again.';
    setTimeout(() => passInput.classList.remove('shake'), 400);
    return;
  }

  lock.classList.add('unlocked');
  if (passInput) passInput.value = '';
}

function lockScreen() {
  const lock = document.getElementById('lock-screen');
  const pass = document.getElementById('lock-pass');
  lock.classList.remove('unlocked');
  if (pass) {
    pass.value = '';
    setTimeout(() => pass.focus(), 300);
  }
}

function initSetupCheck() {
  const isSetupDone = localStorage.getItem('tuos_setup_complete');
  const setupModal = document.getElementById('setup-modal-container');

  if (isSetupDone === 'true') {
    if (setupModal) setupModal.style.display = 'none';
    loadSavedProfile();
  } else {
    if (setupModal) setupModal.style.display = 'flex';
  }
}

function selectRegion(el) {
  document.querySelectorAll('.setup-list-row').forEach(r => r.classList.remove('selected'));
  el.classList.add('selected');
}

function nextSetupStep(stepNumber) {
  document.querySelectorAll('.setup-step').forEach(step => step.classList.remove('active'));
  document.querySelectorAll('.step-item').forEach(item => item.classList.remove('active'));

  const nextStepEl = document.getElementById('setup-step-' + stepNumber);
  const nextNavEl = document.getElementById('step-nav-' + stepNumber);

  if (nextStepEl) nextStepEl.classList.add('active');
  if (nextNavEl) nextNavEl.classList.add('active');
}

function saveUserAccountAndFinalize() {
  const nameInput = document.getElementById('setup-name');
  const passInput = document.getElementById('setup-pass');

  const username = nameInput.value.trim() || 'Tudustech';
  const password = passInput.value;

  localStorage.setItem('tuos_username', username);
  localStorage.setItem('tuos_password', password);

  const lockUserEl = document.querySelector('.lock-username');
  if (lockUserEl) lockUserEl.textContent = username;

  startFinalizing();
}

function startFinalizing() {
  nextSetupStep(3);
  const progressBar = document.getElementById('setup-progress');
  const statusText = document.getElementById('setup-status-text');

  const steps = [
    { progress: '30%', text: 'Setting up user home directories...' },
    { progress: '65%', text: 'Configuring dock and desktop apps...' },
    { progress: '95%', text: 'Registering system preferences...' },
    { progress: '100%', text: 'Welcome to TuOS' }
  ];

  let current = 0;
  const interval = setInterval(() => {
    if (current < steps.length) {
      progressBar.style.width = steps[current].progress;
      statusText.textContent = steps[current].text;
      current++;
    } else {
      clearInterval(interval);
      setTimeout(() => finishSetup(), 700);
    }
  }, 600);
}

function finishSetup() {
  localStorage.setItem('tuos_setup_complete', 'true');
  const setupModal = document.getElementById('setup-modal-container');

  if (setupModal) {
    setupModal.style.opacity = '0';
    setupModal.style.transform = 'scale(0.95)';
    setTimeout(() => {
      setupModal.style.display = 'none';
      lockScreen();
    }, 450);
  }
}

function loadSavedProfile() {
  const savedName = localStorage.getItem('tuos_username');
  if (savedName) {
    const lockUserEl = document.querySelector('.lock-username');
    if (lockUserEl) lockUserEl.textContent = savedName;
  }
}

function resetSetup() {
  localStorage.clear();
  location.reload();
}

window.addEventListener('DOMContentLoaded', initSetupCheck);