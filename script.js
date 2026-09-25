// Calendar State
let calCurrentDate = new Date();

// Clock & Calendar Header
function updateClock() {
  const now = new Date();
  const topbarClock = document.getElementById('topbar-clock-display');
  const calLiveTime = document.getElementById('cal-live-time');
  const calLiveDate = document.getElementById('cal-live-date');

  // Format: "Fri, Sep 25  7:35 PM"
  if (topbarClock) {
    const weekday = now.toLocaleDateString(undefined, { weekday: 'short' });
    const month = now.toLocaleDateString(undefined, { month: 'short' });
    const day = now.getDate();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    topbarClock.textContent = `${weekday}, ${month} ${day}  ${timeStr}`;
  }

  // Live time with seconds: "19:35:09" or "7:35:09 PM"
  if (calLiveTime) {
    calLiveTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  if (calLiveDate) {
    calLiveDate.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
}
setInterval(updateClock, 1000);
updateClock();

// Interactive Calendar Generator
function renderCalendar(date) {
  const monthNameEl = document.getElementById('cal-month-name');
  const daysGridEl = document.getElementById('cal-days-grid');
  if (!daysGridEl) return;

  const year = date.getFullYear();
  const month = date.getMonth();

  if (monthNameEl) {
    monthNameEl.textContent = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  daysGridEl.innerHTML = '';

  const firstDayIndex = new Date(year, month, 1).getDay();
  // Adjust Monday-first (0 = Monday, 6 = Sunday)
  const startingDay = (firstDayIndex + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Previous month trailing days
  for (let i = startingDay - 1; i >= 0; i--) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month';
    cell.textContent = daysInPrevMonth - i;
    daysGridEl.appendChild(cell);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    if (isCurrentMonth && d === today.getDate()) {
      cell.classList.add('today');
    }
    cell.textContent = d;
    daysGridEl.appendChild(cell);
  }

  // Next month leading days to complete grid
  const totalCells = startingDay + daysInMonth;
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let n = 1; n <= remainingCells; n++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month';
    cell.textContent = n;
    daysGridEl.appendChild(cell);
  }
}

function prevCalMonth(e) {
  if (e) e.stopPropagation();
  calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
  renderCalendar(calCurrentDate);
}

function nextCalMonth(e) {
  if (e) e.stopPropagation();
  calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
  renderCalendar(calCurrentDate);
}

// Depth Management & Active Window
let highestZ = 100;
function bringToFront(win) {
  highestZ++;
  win.style.zIndex = highestZ;
  document.querySelectorAll('.window').forEach(w => w.classList.remove('active-window'));
  win.classList.add('active-window');
}

// Window Transform States (Hardware Accelerated 60 FPS translate3d)
const windowStates = new Map();

function initWindowTransform(win) {
  if (windowStates.has(win)) return windowStates.get(win);
  const initialLeft = win.offsetLeft || 120;
  const initialTop = win.offsetTop || 80;
  
  // Clear style left/top to prevent layout recalculations
  win.style.left = '0px';
  win.style.top = '0px';
  
  const state = {
    x: initialLeft,
    y: initialTop,
    prevX: initialLeft,
    prevY: initialTop,
    prevWidth: win.style.width || '400px',
    prevHeight: win.style.height || '300px',
    isMaximized: false
  };
  windowStates.set(win, state);
  win.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(1)`;
  return state;
}

// Window Controls with Dock Bounce & Organic Scale Transitions
function openWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;

  const state = initWindowTransform(win);

  const wrapper = document.querySelector(`.dock-wrapper[data-app="${id}"]`);
  if (wrapper) {
    wrapper.classList.remove('bouncing');
    void wrapper.offsetWidth;
    wrapper.classList.add('bouncing');
    setTimeout(() => wrapper.classList.remove('bouncing'), 720);
  }

  bringToFront(win);
  win.classList.remove('is-closing');
  win.classList.add('is-animating-state');
  
  // Calculate dock icon origin for organic scale zoom from dock
  let originX = state.x;
  let originY = state.y;
  let startScale = 0.85;

  if (wrapper) {
    const wrapRect = wrapper.getBoundingClientRect();
    const winWidth = win.offsetWidth || parseInt(win.style.width, 10) || 360;
    originX = wrapRect.left + wrapRect.width / 2 - winWidth / 2;
    originY = wrapRect.top - 80;
    startScale = 0.4;
  }

  // Initial state: smooth scale and slight elevation
  win.style.transform = `translate3d(${originX}px, ${originY}px, 0) scale(${startScale})`;
  win.style.opacity = '0';
  win.classList.add('is-open');

  // Trigger GPU fluid transition into place
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      win.style.transform = state.isMaximized 
        ? `translate3d(0px, 0px, 0) scale(1)` 
        : `translate3d(${state.x}px, ${state.y}px, 0) scale(1)`;
      win.style.opacity = '1';
      setTimeout(() => {
        win.classList.remove('is-animating-state');
      }, 320);
    });
  });

  const dot = document.getElementById('dot-' + id);
  if (dot) dot.classList.add('active');

  if (id === 'weather-window') {
    fetchLiveWeather();
  }
}

// Window Close with Fluid Shrink Animation
function closeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;

  const state = initWindowTransform(win);
  win.classList.remove('active-window');
  win.classList.add('is-animating-state');
  win.classList.add('is-closing');

  const wrapper = document.querySelector(`.dock-wrapper[data-app="${id}"]`);
  let targetX = state.x;
  let targetY = state.y;
  let targetScale = 0.85;

  if (wrapper) {
    const wrapRect = wrapper.getBoundingClientRect();
    const winWidth = win.offsetWidth || parseInt(win.style.width, 10) || 360;
    targetX = wrapRect.left + wrapRect.width / 2 - winWidth / 2;
    targetY = wrapRect.top - 80;
    targetScale = 0.4;
  }

  win.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) scale(${targetScale})`;
  win.style.opacity = '0';

  const dot = document.getElementById('dot-' + id);
  if (dot) dot.classList.remove('active');

  setTimeout(() => {
    win.classList.remove('is-open', 'is-closing', 'is-animating-state');
  }, 300);
}

function toggleWindow(id) {
  const win = document.getElementById(id);
  if (win && win.classList.contains('is-open') && !win.classList.contains('is-closing')) {
    closeWindow(id);
  } else {
    openWindow(id);
  }
}

function toggleMaximize(id) {
  const win = document.getElementById(id);
  if (!win) return;
  const state = initWindowTransform(win);

  win.classList.add('is-animating-state');
  if (state.isMaximized) {
    state.isMaximized = false;
    win.classList.remove('maximized');
    win.style.width = state.prevWidth;
    win.style.height = state.prevHeight;
    win.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(1)`;
  } else {
    state.prevX = state.x;
    state.prevY = state.y;
    state.prevWidth = win.style.width;
    state.prevHeight = win.style.height;
    state.isMaximized = true;

    win.classList.add('maximized');
    win.style.width = '100vw';
    win.style.height = 'calc(100vh - 28px - 74px)';
    win.style.transform = `translate3d(0px, 0px, 0) scale(1)`;
  }

  setTimeout(() => {
    win.classList.remove('is-animating-state');
  }, 320);

  bringToFront(win);
}

// Launchpad with smooth spring zoom and fade
function toggleLaunchpad() {
  const lp = document.getElementById('launchpad-overlay');
  const dot = document.getElementById('dot-launchpad');
  if (!lp) return;

  if (lp.classList.contains('is-open')) {
    lp.classList.remove('is-open');
    lp.classList.add('is-closing');
    if (dot) dot.classList.remove('active');

    const onTransEnd = () => {
      lp.removeEventListener('transitionend', onTransEnd);
      lp.classList.remove('is-closing');
    };
    lp.addEventListener('transitionend', onTransEnd, { once: true });
    setTimeout(onTransEnd, 350);
  } else {
    lp.classList.remove('is-closing');
    lp.classList.add('is-open');
    if (dot) dot.classList.add('active');

    const wrapper = document.querySelector('.dock-wrapper[data-app="launchpad"]');
    if (wrapper) {
      wrapper.classList.remove('bouncing');
      void wrapper.offsetWidth;
      wrapper.classList.add('bouncing');
      setTimeout(() => wrapper.classList.remove('bouncing'), 720);
    }
  }
}

// macOS Dock Magnification Wave without layout jitter
const dock = document.getElementById('macos-dock');
const dockItems = document.querySelectorAll('.dock-item');
const MAX_SCALE = 1.28;
const MAX_DISTANCE = 90;

if (dock) {
  let dockRafId = null;

  dock.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;
    if (dockRafId) cancelAnimationFrame(dockRafId);
    dockRafId = requestAnimationFrame(() => {
      dockItems.forEach((item) => {
        const wrapper = item.closest('.dock-wrapper');
        if (wrapper && wrapper.classList.contains('bouncing')) {
          return;
        }

        const rect = item.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const distance = Math.abs(mouseX - itemCenterX);

        if (distance < MAX_DISTANCE) {
          const factor = Math.cos((distance / MAX_DISTANCE) * (Math.PI / 2));
          const scale = 1 + (MAX_SCALE - 1) * Math.pow(factor, 1.8);
          item.style.transform = `scale(${scale})`;
        } else {
          item.style.transform = 'scale(1)';
        }
      });
    });
  });

  dock.addEventListener('mouseleave', () => {
    if (dockRafId) cancelAnimationFrame(dockRafId);
    dockItems.forEach((item) => {
      const wrapper = item.closest('.dock-wrapper');
      if (!wrapper || !wrapper.classList.contains('bouncing')) {
        item.style.transform = 'scale(1)';
      }
    });
  });
}

// 60 FPS Hardware-Accelerated Window Dragging (requestAnimationFrame + translate3d)
document.querySelectorAll('.window').forEach(windowEl => {
  const header = windowEl.querySelector('.window-header');
  if (!header) return;

  const state = initWindowTransform(windowEl);
  let isDragging = false;
  let startX = 0, startY = 0;
  let dragOriginX = 0, dragOriginY = 0;
  let dragRafId = null;

  windowEl.addEventListener('mousedown', () => bringToFront(windowEl));

  const updatePosition = () => {
    windowEl.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(1)`;
    dragRafId = null;
  };

  const startDrag = (clientX, clientY) => {
    if (state.isMaximized) return;
    isDragging = true;
    windowEl.classList.remove('is-animating-state');
    bringToFront(windowEl);
    startX = clientX;
    startY = clientY;
    dragOriginX = state.x;
    dragOriginY = state.y;
  };

  const moveDrag = (clientX, clientY) => {
    if (!isDragging) return;
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    state.x = dragOriginX + deltaX;
    state.y = Math.max(0, dragOriginY + deltaY);

    if (!dragRafId) {
      dragRafId = requestAnimationFrame(updatePosition);
    }
  };

  const stopDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    if (dragRafId) {
      cancelAnimationFrame(dragRafId);
      dragRafId = null;
    }
    updatePosition();
  };

  header.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('dot')) return;
    startDrag(e.clientX, e.clientY);
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) moveDrag(e.clientX, e.clientY);
  });
  document.addEventListener('mouseup', stopDrag);

  // Touch Support for mobile/tablets
  header.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('dot')) return;
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

// Dropdowns
function toggleDropdown(id) {
  const el = document.getElementById(id);
  if (!el) return;

  if (id === 'calendar-dropdown') {
    const isOpening = !el.classList.contains('is-open');
    closeAllDropdowns();
    if (isOpening) {
      renderCalendar(calCurrentDate);
      el.classList.add('is-open');
    }
    return;
  }

  const isOpen = el.style.display === 'block' || el.style.display === 'flex';
  closeAllDropdowns();
  if (!isOpen) {
    el.style.display = (id === 'control-center-dropdown') ? 'flex' : 'block';
  }
}

function closeAllDropdowns() {
  const appDropdown = document.getElementById('apple-dropdown');
  const ccDropdown = document.getElementById('control-center-dropdown');
  const calDropdown = document.getElementById('calendar-dropdown');
  if (appDropdown) appDropdown.style.display = 'none';
  if (ccDropdown) ccDropdown.style.display = 'none';
  if (calDropdown) calDropdown.classList.remove('is-open');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.topbar-icon-wrap') && 
      !e.target.closest('#apple-dropdown') &&
      !e.target.closest('.center-menu') &&
      !e.target.closest('#calendar-dropdown') &&
      !e.target.closest('.menu-btn') &&
      !e.target.closest('#control-center-dropdown')) {
    closeAllDropdowns();
  }
});

function adjustBrightness(val) {
  document.documentElement.style.setProperty('--brightness', val / 100);
}

// Calculator
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

// Weather Service (Real live status & hourly forecast via Open-Meteo)
const WMO_WEATHER_CODES = {
  0: { desc: 'Clear sky', icon: '☀️' },
  1: { desc: 'Mainly clear', icon: '🌤️' },
  2: { desc: 'Partly cloudy', icon: '⛅' },
  3: { desc: 'Overcast', icon: '☁️' },
  45: { desc: 'Foggy', icon: '🌫️' },
  48: { desc: 'Depositing rime fog', icon: '🌫️' },
  51: { desc: 'Light drizzle', icon: '🌦️' },
  53: { desc: 'Moderate drizzle', icon: '🌦️' },
  55: { desc: 'Dense drizzle', icon: '🌧️' },
  61: { desc: 'Slight rain', icon: '🌧️' },
  63: { desc: 'Moderate rain', icon: '🌧️' },
  65: { desc: 'Heavy rain', icon: '🌧️' },
  71: { desc: 'Slight snowfall', icon: '🌨️' },
  73: { desc: 'Moderate snowfall', icon: '🌨️' },
  75: { desc: 'Heavy snowfall', icon: '❄️' },
  77: { desc: 'Snow grains', icon: '❄️' },
  80: { desc: 'Slight rain showers', icon: '🌦️' },
  81: { desc: 'Moderate rain showers', icon: '🌧️' },
  82: { desc: 'Violent rain showers', icon: '⛈️' },
  85: { desc: 'Slight snow showers', icon: '🌨️' },
  86: { desc: 'Heavy snow showers', icon: '❄️' },
  95: { desc: 'Thunderstorm', icon: '⛈️' },
  96: { desc: 'Thunderstorm with slight hail', icon: '⛈️' },
  99: { desc: 'Thunderstorm with heavy hail', icon: '⛈️' }
};

function getWeatherInfo(code) {
  return WMO_WEATHER_CODES[code] || { desc: 'Partly cloudy', icon: '⛅' };
}

async function fetchLiveWeather() {
  const tempEl = document.getElementById('weather-temp-val');
  const descEl = document.getElementById('weather-desc-val');
  const windEl = document.getElementById('weather-wind-val');
  const humidityEl = document.getElementById('weather-humidity-val');
  const hourlyTrack = document.getElementById('weather-hourly-list');
  const updateTimeEl = document.getElementById('weather-update-time');
  const refreshBtn = document.querySelector('.weather-refresh-btn');

  if (refreshBtn) refreshBtn.style.transform = 'rotate(180deg)';
  if (descEl) descEl.textContent = 'Updating...';

  try {
    const lat = 44.4323;
    const lon = 26.1063;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=2`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();

    const current = data.current;
    const hourly = data.hourly;

    const weatherInfo = getWeatherInfo(current.weather_code);
    if (tempEl) tempEl.textContent = `${Math.round(current.temperature_2m)}°C`;
    if (descEl) descEl.textContent = weatherInfo.desc;
    if (windEl) windEl.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    if (humidityEl) humidityEl.textContent = `${Math.round(current.relative_humidity_2m)}%`;

    if (updateTimeEl) {
      const now = new Date();
      updateTimeEl.textContent = `Updated ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (hourly && hourly.time && hourlyTrack) {
      const now = new Date();
      const currentIsoHour = now.toISOString().slice(0, 13);
      let startIndex = hourly.time.findIndex(t => t.startsWith(currentIsoHour));
      if (startIndex === -1) startIndex = 0;

      const next12Hours = hourly.time.slice(startIndex, startIndex + 12);
      hourlyTrack.innerHTML = '';

      next12Hours.forEach((timeStr, idx) => {
        const hourDate = new Date(timeStr);
        const hourLabel = idx === 0 ? 'Now' : hourDate.toLocaleTimeString([], { hour: 'numeric', hour12: true });
        const hourTemp = Math.round(hourly.temperature_2m[startIndex + idx]);
        const hourCode = hourly.weather_code[startIndex + idx];
        const hourInfo = getWeatherInfo(hourCode);

        const card = document.createElement('div');
        card.className = `weather-hour-card ${idx === 0 ? 'is-now' : ''}`;
        card.innerHTML = `
          <span class="hour-time">${hourLabel}</span>
          <span class="hour-icon" title="${hourInfo.desc}">${hourInfo.icon}</span>
          <span class="hour-temp">${hourTemp}°</span>
        `;
        hourlyTrack.appendChild(card);
      });
    }
  } catch (err) {
    if (descEl) descEl.textContent = 'Live status cached';
    if (tempEl && tempEl.textContent === '--°C') tempEl.textContent = '22°C';
    if (windEl && windEl.textContent === '-- km/h') windEl.textContent = '14 km/h';
    if (humidityEl && humidityEl.textContent === '--%') humidityEl.textContent = '48%';
    if (updateTimeEl) updateTimeEl.textContent = 'Offline fallback';

    if (hourlyTrack && hourlyTrack.children.length <= 1) {
      const fallbackHours = [
        { time: 'Now', temp: 22, icon: '☀️' },
        { time: '20:00', temp: 21, icon: '🌤️' },
        { time: '21:00', temp: 20, icon: '🌤️' },
        { time: '22:00', temp: 19, icon: '⛅' },
        { time: '23:00', temp: 18, icon: '⛅' },
        { time: '00:00', temp: 17, icon: '☁️' },
        { time: '01:00', temp: 16, icon: '☁️' },
        { time: '02:00', temp: 16, icon: '☁️' },
        { time: '03:00', temp: 15, icon: '☁️' }
      ];
      hourlyTrack.innerHTML = fallbackHours.map((h, i) => `
        <div class="weather-hour-card ${i === 0 ? 'is-now' : ''}">
          <span class="hour-time">${h.time}</span>
          <span class="hour-icon">${h.icon}</span>
          <span class="hour-temp">${h.temp}°</span>
        </div>
      `).join('');
    }
  } finally {
    if (refreshBtn) {
      setTimeout(() => {
        refreshBtn.style.transform = 'rotate(0deg)';
      }, 300);
    }
  }
}

// Notes Auto-Save
const notesArea = document.getElementById('notes-textarea');
if (notesArea) {
  notesArea.value = localStorage.getItem('tuos_saved_notes') || '';
  notesArea.addEventListener('input', (e) => {
    localStorage.setItem('tuos_saved_notes', e.target.value);
  });
}

// Lock Screen
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

function lockScreen() {
  const lock = document.getElementById('lock-screen');
  const pass = document.getElementById('lock-pass');
  const hintMsg = document.getElementById('lock-hint-msg');
  if (!lock) return;

  lock.classList.remove('is-unlocking');
  lock.classList.add('is-open');

  if (hintMsg) {
    hintMsg.textContent = 'Press Enter to unlock';
    hintMsg.classList.remove('error');
  }

  if (pass) {
    pass.value = '';
    setTimeout(() => pass.focus(), 200);
  }
}

function unlockScreen(e) {
  if (e) e.preventDefault();
  const lock = document.getElementById('lock-screen');
  const passInput = document.getElementById('lock-pass');
  const lockForm = document.querySelector('.lock-form');
  const hintMsg = document.getElementById('lock-hint-msg');
  const savedPassword = localStorage.getItem('tuos_password') || '';

  if (savedPassword && passInput && passInput.value !== savedPassword) {
    // macOS shake animation on error
    if (lockForm) {
      lockForm.classList.remove('shake');
      void lockForm.offsetWidth; // Trigger reflow
      lockForm.classList.add('shake');
      setTimeout(() => lockForm.classList.remove('shake'), 500);
    }
    if (hintMsg) {
      hintMsg.textContent = 'Wrong password. Try again.';
      hintMsg.classList.add('error');
    }
    if (passInput) {
      passInput.select();
      passInput.focus();
    }
    return;
  }

  // Smooth sliding exit translateY(-100%)
  if (lock) {
    lock.classList.add('is-unlocking');
    const onUnlockEnd = () => {
      lock.removeEventListener('transitionend', onUnlockEnd);
      lock.classList.remove('is-open', 'is-unlocking');
    };
    lock.addEventListener('transitionend', onUnlockEnd, { once: true });
    setTimeout(onUnlockEnd, 550);
  }
  if (passInput) passInput.value = '';
}

// Setup Assistant
function openSetup() {
  const setupModal = document.getElementById('setup-modal-container');
  if (setupModal) {
    setupModal.classList.remove('is-closing');
    setupModal.classList.add('is-open');
  }
  nextSetupStep(1);
}

function closeSetup() {
  const setupModal = document.getElementById('setup-modal-container');
  if (!setupModal) return;

  setupModal.classList.remove('is-open');
  setupModal.classList.add('is-closing');
  const onSetupCloseEnd = () => {
    setupModal.removeEventListener('transitionend', onSetupCloseEnd);
    setupModal.classList.remove('is-closing');
  };
  setupModal.addEventListener('transitionend', onSetupCloseEnd, { once: true });
  setTimeout(onSetupCloseEnd, 350);
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

  const username = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : 'Tudustech';
  const password = passInput ? passInput.value : '';

  localStorage.setItem('tuos_username', username);
  localStorage.setItem('tuos_password', password);

  const lockUserEl = document.querySelector('.lock-username');
  if (lockUserEl) lockUserEl.textContent = username;

  nextSetupStep(3);

  const progressBar = document.getElementById('setup-progress');
  const statusText = document.getElementById('setup-status-text');

  setTimeout(() => {
    if (progressBar) progressBar.style.width = '42%';
    if (statusText) statusText.textContent = 'Configuring apps...';
  }, 400);

  setTimeout(() => {
    if (progressBar) progressBar.style.width = '82%';
    if (statusText) statusText.textContent = 'Saving preferences...';
  }, 950);

  setTimeout(() => {
    if (progressBar) progressBar.style.width = '100%';
    if (statusText) statusText.textContent = 'Welcome to TuOS!';
    setTimeout(() => {
      closeSetup();
      localStorage.setItem('tuos_setup_complete', 'true');
    }, 700);
  }, 1500);
}

function resetAll() {
  localStorage.clear();
  location.reload();
}

// First Boot Check & Weather Initialization
window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('tuos_setup_complete') !== 'true') {
    openSetup();
  }
  fetchLiveWeather();
});