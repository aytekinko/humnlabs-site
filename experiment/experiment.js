/**
 * Human Presence Experiment v0.1 — HUMNLABS
 * All signal collection and scoring runs entirely in the browser.
 * No data is transmitted to any server.
 */

'use strict';

// ============================================================
// STATE
// ============================================================
const ExpState = {
  isSessionActive: false,
  currentPhase: 'welcome',
  signals: {
    reaction: { round: 0, times: [], status: 'idle', timeoutId: null, startTime: null, accessibleAlternative: false },
    movement: { points: [], collecting: false, timeRemaining: 5 },
    typing:   { phrase: 'human presence is not proof of identity', keyIntervals: [], lastKeyTime: null, typed: '' }
  },
  result: null
};

// ============================================================
// REFRESH SAFETY — named so it can be added/removed cleanly
// ============================================================
function warnOnRefresh(e) {
  e.preventDefault();
  e.returnValue = '';
}

// ============================================================
// ACTIVE LISTENER & TIMER REGISTRY
// Tracks all phase-scoped listeners/timers so they can be
// torn down cleanly before any phase transition (incl. Back/Fwd).
// ============================================================
const ActiveListeners = {
  listeners: [],   // { target, type, fn, opts }
  intervals: [],   // intervalId
  timeouts:  [],   // timeoutId

  addListener(target, type, fn, opts) {
    target.addEventListener(type, fn, opts || false);
    this.listeners.push({ target, type, fn, opts });
  },

  addInterval(id) {
    this.intervals.push(id);
  },

  addTimeout(id) {
    this.timeouts.push(id);
  },

  teardown() {
    this.listeners.forEach(({ target, type, fn, opts }) => {
      target.removeEventListener(type, fn, opts || false);
    });
    this.listeners = [];
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts = [];
  }
};

// ============================================================
// ROUTER & STATE VALIDATION (Zero-persistence privacy protection)
// ============================================================
function getPhaseFromHash(hash) {
  if (!hash) return 'welcome';
  const clean = hash.replace(/^#/, '').replace(/^exp-/, '').replace(/^task-/, '');
  const map = {
    'welcome': 'welcome',
    'instructions': 'instructions',
    'reaction': 'task-reaction',
    'movement': 'task-movement',
    'typing': 'task-typing',
    'analyzing': 'analyzing',
    'result': 'result'
  };
  return map[clean] || 'welcome';
}

function hasValidStateForPhase(phase) {
  if (phase === 'welcome' || phase === 'instructions') {
    return true;
  }

  const s = ExpState.signals;

  if (phase === 'task-reaction') {
    return ExpState.isSessionActive === true || (s.reaction && s.reaction.round > 0);
  }

  if (phase === 'task-movement') {
    return s.reaction && Array.isArray(s.reaction.times) && (s.reaction.times.length > 0 || s.reaction.accessibleAlternative === true);
  }

  if (phase === 'task-typing') {
    return s.reaction && Array.isArray(s.reaction.times) && (s.reaction.times.length > 0 || s.reaction.accessibleAlternative === true) &&
           s.movement && Array.isArray(s.movement.points) && s.movement.points.length >= 10;
  }

  if (phase === 'analyzing' || phase === 'result') {
    return s.reaction && Array.isArray(s.reaction.times) && (s.reaction.times.length > 0 || s.reaction.accessibleAlternative === true) &&
           s.movement && Array.isArray(s.movement.points) && s.movement.points.length >= 10 &&
           s.typing && Array.isArray(s.typing.keyIntervals) && s.typing.keyIntervals.length > 0;
  }

  return false;
}

function resetToWelcome() {
  ExpState.isSessionActive  = false;
  if (ExpState.signals.reaction.timeoutId) {
    clearTimeout(ExpState.signals.reaction.timeoutId);
  }
  ExpState.signals.reaction = { round: 0, times: [], status: 'idle', timeoutId: null, startTime: null, accessibleAlternative: false };
  ExpState.signals.movement = { points: [], collecting: false, timeRemaining: 5 };
  ExpState.signals.typing   = { phrase: 'human presence is not proof of identity', keyIntervals: [], lastKeyTime: null, typed: '' };
  ExpState.result           = null;

  history.replaceState({ phase: 'welcome' }, '', window.location.pathname + window.location.search);
  showPhase('welcome');
}

// ============================================================
// PHASE MANAGEMENT
// ============================================================
function showPhase(name, pushHistory = true) {
  if (name !== 'welcome' && !hasValidStateForPhase(name)) {
    resetToWelcome();
    return;
  }

  // Tear down all active listeners, intervals, and timeouts
  // from the previous phase BEFORE initializing the next one.
  ActiveListeners.teardown();

  // Also cancel the reaction timeout stored on state (may have
  // been set before the registry existed or after a hard reset).
  if (ExpState.signals.reaction.timeoutId) {
    clearTimeout(ExpState.signals.reaction.timeoutId);
    ExpState.signals.reaction.timeoutId = null;
  }

  // Stop any in-progress movement collection
  ExpState.signals.movement.collecting = false;

  // Bind refresh warning during active data collection phases
  const activeDataPhases = ['task-reaction', 'task-movement', 'task-typing', 'analyzing'];
  if (activeDataPhases.includes(name)) {
    window.addEventListener('beforeunload', warnOnRefresh);
  } else {
    window.removeEventListener('beforeunload', warnOnRefresh);
  }

  // Push history state ONLY for forward user navigation, NOT during popstate history traversal
  if (pushHistory) {
    const navPhases = ['task-reaction', 'task-movement', 'task-typing', 'result'];
    if (navPhases.includes(name)) {
      const hashName = name === 'result' ? 'result' : name.replace('task-', '');
      history.pushState({ phase: name }, '', '#' + hashName);
    } else if (name === 'welcome') {
      if (window.location.hash) {
        history.replaceState({ phase: 'welcome' }, '', window.location.pathname + window.location.search);
      }
    }
  }

  document.querySelectorAll('.exp-phase').forEach(el => {
    el.classList.remove('exp-phase--active');
  });

  const target = document.getElementById(`phase-${name}`);
  if (target) {
    requestAnimationFrame(() => {
      target.classList.add('exp-phase--active');
      // Accessibility: move keyboard focus to the new section heading
      const heading = target.querySelector('h1, h2, h3');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    });
  }

  ExpState.currentPhase = name;
  updateProgress(name);

  // ARIA Live Announcement for phase transitions
  const announcer = document.getElementById('exp-aria-announcer');
  if (announcer) {
    const screenFriendlyNames = {
      'welcome': 'Welcome to Human Presence Experiment v0.1',
      'instructions': 'Instructions phase. Learn how signal collection works.',
      'task-reaction': 'Task 1: Reaction timing task. Click target when Now appears.',
      'task-movement': 'Task 2: Movement tracking task. Draw lines inside the movement area.',
      'task-typing': 'Task 3: Keystroke timing task. Type the phrase shown in input field.',
      'analyzing': 'Preparing your educational session signal summary.',
      'result': 'Demonstration complete. Educational session signal summary ready.'
    };
    announcer.textContent = screenFriendlyNames[name] || `Switched to phase: ${name}`;
  }

  // Show footer only on welcome and result phases
  const showFooter = name === 'welcome' || name === 'result';
  const footer = document.querySelector('.app-footer');
  if (footer) footer.style.display = showFooter ? '' : 'none';

  // Always scroll to top on phase change so content is visible
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const init = PhaseInits[name];
  if (init) {
    const initTid = setTimeout(init, 50);
    ActiveListeners.addTimeout(initTid);
  }
}

function updateProgress(phase) {
  const bar     = document.getElementById('exp-progress-bar');
  const wrapper = document.getElementById('exp-progress');
  const steps   = ['task-reaction', 'task-movement', 'task-typing', 'analyzing', 'result'];
  const idx     = steps.indexOf(phase);

  if (!bar || !wrapper) return;

  if (idx === -1) {
    wrapper.style.opacity = '0';
    wrapper.style.pointerEvents = 'none';
    return;
  }

  wrapper.style.opacity = '1';
  wrapper.style.pointerEvents = 'all';
  bar.style.width = `${((idx + 1) / steps.length) * 100}%`;

  // Update step dots
  steps.forEach((s, i) => {
    const dot = document.getElementById(`step-${i + 1}`);
    if (!dot) return;
    if (i < idx)       dot.className = 'exp-step exp-step--done';
    else if (i === idx) dot.className = 'exp-step exp-step--active';
    else               dot.className = 'exp-step';
  });
}

const PhaseInits = {
  'task-reaction': initReactionTask,
  'task-movement': initMovementTask,
  'task-typing':   initTypingTask,
  'analyzing':     initAnalyzing,
  'result':        initResult,
};

// ============================================================
// SIGNAL 01 — REACTION TIMING
// ============================================================
function initReactionTask() {
  const state   = ExpState.signals.reaction;

  // Cancel any pending round timeout from a previous or interrupted visit
  if (state.timeoutId) {
    clearTimeout(state.timeoutId);
    state.timeoutId = null;
  }

  state.round   = 0;
  state.times   = [];
  state.status  = 'idle';
  state.accessibleAlternative = false;

  const list = document.getElementById('reaction-results');
  if (list) list.innerHTML = '';

  // Reset target button state
  const target = document.getElementById('reaction-target');
  if (target) {
    target.onclick = null;
    target.dataset.state = 'idle';
    target.innerHTML = '';
  }

  // Accessible alternative button handler
  const altBtn = document.getElementById('reaction-alt-btn');
  if (altBtn) {
    altBtn.onclick = () => {
      // Cancel any pending reaction timer safely
      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
        state.timeoutId = null;
      }
      ActiveListeners.teardown();

      // Mark accessible alternative used with empty times array
      state.times = [];
      state.accessibleAlternative = true;
      state.status = 'idle';

      // Move directly to Task 2 (Movement Analysis)
      showPhase('task-movement');
    };
  }

  updateRoundLabel(1);
  startReactionRound();
}

function startReactionRound() {
  const state  = ExpState.signals.reaction;
  const target = document.getElementById('reaction-target');
  if (!target) return;

  state.status   = 'waiting';
  target.dataset.state = 'waiting';
  target.innerHTML = `<span class="rt-inner-text">GET<br>READY</span>`;
  target.onclick = null;

  const delay = 800 + Math.random() * 2200;
  const tid = setTimeout(() => {
    if (ExpState.currentPhase !== 'task-reaction') return;
    state.status     = 'go';
    state.startTime  = performance.now();
    target.dataset.state = 'go';
    target.innerHTML = `<span class="rt-inner-text">NOW!</span>`;
    target.onclick   = handleReactionClick;
  }, delay);
  // Register with both state (for teardown on reset) and registry (for Back-button teardown)
  state.timeoutId = tid;
  ActiveListeners.addTimeout(tid);
}

function handleReactionClick() {
  const state = ExpState.signals.reaction;
  if (state.status !== 'go') return;

  let elapsed = performance.now() - state.startTime;
  const isInvalid = elapsed > 5000;
  if (!isInvalid) {
    elapsed = Math.min(elapsed, 3000);
  }
  state.times.push(elapsed);
  state.status = 'idle';
  state.round++;

  const target = document.getElementById('reaction-target');
  if (target) {
    target.onclick       = null;
    target.dataset.state = isInvalid ? 'invalid' : 'hit';
    target.innerHTML     = isInvalid 
      ? `<span class="rt-inner-text" style="color:#ef4444;font-size:12px;font-weight:800;letter-spacing:1px;">INVALID</span>`
      : `<span class="rt-inner-text">${Math.round(elapsed)}<br><small>ms</small></span>`;
  }

  appendReactionResult(state.round, elapsed);

  if (state.round < 3) {
    updateRoundLabel(state.round + 1);
    const roundTid1 = setTimeout(() => {
      if (ExpState.currentPhase !== 'task-reaction') return;
      if (target) {
        target.dataset.state = 'idle';
        target.innerHTML     = '';
      }
      const roundTid2 = setTimeout(startReactionRound, 400);
      ActiveListeners.addTimeout(roundTid2);
    }, 900);
    ActiveListeners.addTimeout(roundTid1);
  } else {
    if (target) {
      target.dataset.state = 'done';
      target.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="40" height="40"><polyline points="20 6 9 17 4 12"/></svg>`;
    }
    const moveTid = setTimeout(() => showPhase('task-movement'), 1600);
    ActiveListeners.addTimeout(moveTid);
  }
}

function appendReactionResult(round, ms) {
  const list = document.getElementById('reaction-results');
  if (!list) return;
  const item = document.createElement('div');
  item.className = 'rt-result-item';
  if (ms > 5000) {
    item.style.borderColor = 'rgba(239,68,68,0.25)';
    item.style.background = 'rgba(239,68,68,0.04)';
    item.innerHTML = `
      <span class="rt-result-label">Round ${round}</span>
      <span class="rt-result-time" style="color:#ef4444;font-size:11px;letter-spacing:0.5px;">INVALID</span>
    `;
  } else {
    item.innerHTML = `
      <span class="rt-result-label">Round ${round}</span>
      <span class="rt-result-time">${Math.round(ms)}<span class="rt-result-unit">ms</span></span>
    `;
  }
  list.appendChild(item);
}

function updateRoundLabel(round) {
  const el = document.getElementById('reaction-round');
  if (el) el.textContent = `Round ${round} of 3`;
}

// ============================================================
// SIGNAL 02 — MOVEMENT ANALYSIS
// ============================================================
function initMovementTask() {
  const state = ExpState.signals.movement;
  state.points        = [];
  state.collecting    = false;
  state.timeRemaining = 5;

  const timerEl  = document.getElementById('movement-timer');
  const startBtn = document.getElementById('movement-start-btn');
  const canvas   = document.getElementById('movement-canvas');
  const ctx      = canvas ? canvas.getContext('2d') : null;

  if (timerEl)  timerEl.textContent = '5';
  if (startBtn) startBtn.style.display = '';

  // Size canvas and clear any previous drawing
  const zone = document.getElementById('movement-zone');
  if (canvas && zone) {
    canvas.width  = zone.clientWidth  || 300;
    canvas.height = zone.clientHeight || 200;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (startBtn) {
    // Use a fresh onclick each init; no registry needed (single inline handler)
    startBtn.onclick = () => {
      startBtn.style.display = 'none';
      beginMovementCollection(ctx, canvas, timerEl);
    };
  }
}

function beginMovementCollection(ctx, canvas, timerEl) {
  const state    = ExpState.signals.movement;
  state.points   = [];
  state.collecting   = true;
  state.timeRemaining = 5;

  let lastX = null, lastY = null;

  const addPoint = (cx, cy) => {
    if (!state.collecting) return;
    const now = performance.now();
    state.points.push({ x: cx, y: cy, t: now });

    if (ctx && lastX !== null) {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(cx, cy);
      ctx.strokeStyle = 'rgba(0,240,255,0.55)';
      ctx.lineWidth   = 2;
      ctx.lineCap     = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,240,255,0.35)';
      ctx.fill();
    }
    lastX = cx;
    lastY = cy;
  };

  let currX = canvas ? canvas.width / 2 : 150;
  let currY = canvas ? canvas.height / 2 : 100;
  addPoint(currX, currY);

  const zone = document.getElementById('movement-zone');
  if (!zone) return;

  const onMouse = (e) => {
    const r = canvas.getBoundingClientRect();
    addPoint(e.clientX - r.left, e.clientY - r.top);
  };
  const onTouch = (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    addPoint(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top);
  };
  const onKey = (e) => {
    if (!state.collecting) return;
    let moved = false;
    const step = 20;
    if (e.key === 'ArrowUp' || e.key === 'w') { currY = Math.max(10, currY - step); moved = true; }
    else if (e.key === 'ArrowDown' || e.key === 's') { currY = Math.min(canvas.height - 10, currY + step); moved = true; }
    else if (e.key === 'ArrowLeft' || e.key === 'a') { currX = Math.max(10, currX - step); moved = true; }
    else if (e.key === 'ArrowRight' || e.key === 'd') { currX = Math.min(canvas.width - 10, currX + step); moved = true; }

    if (moved) {
      e.preventDefault();
      addPoint(currX, currY);
    }
  };

  // Register all movement-phase listeners with the central registry
  // so Back-button teardown removes them automatically.
  ActiveListeners.addListener(zone, 'mousemove', onMouse);
  ActiveListeners.addListener(zone, 'touchmove', onTouch, { passive: false });
  ActiveListeners.addListener(window, 'keydown', onKey);

  const tick = setInterval(() => {
    if (!state.collecting) { clearInterval(tick); return; }
    state.timeRemaining--;
    if (timerEl) timerEl.textContent = state.timeRemaining > 0 ? state.timeRemaining : '\u2713';

    if (state.timeRemaining <= 0) {
      clearInterval(tick);
      state.collecting = false;
      // Remove via registry-aware wrappers (listeners already registered above)
      zone.removeEventListener('mousemove', onMouse);
      zone.removeEventListener('touchmove', onTouch);
      window.removeEventListener('keydown', onKey);

      // BUG-09: Require at least 10 points; fewer means the user didn't move at all
      if (state.points.length < 10) {
        if (timerEl) timerEl.textContent = '!';
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'rgba(239,68,68,0.65)';
          ctx.font = '13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('No movement detected — tap Start and move your cursor', canvas.width / 2, canvas.height / 2);
        }
        // Re-show the start button for a retry
        const retryBtn = document.getElementById('movement-start-btn');
        if (retryBtn) {
          retryBtn.style.display = '';
          state.timeRemaining = 5;
          if (timerEl) timerEl.textContent = '5';
        }
        return;
      }

      const advanceTid = setTimeout(() => showPhase('task-typing'), 1000);
      ActiveListeners.addTimeout(advanceTid);
    }
  }, 1000);
  ActiveListeners.addInterval(tick);
}

// ============================================================
// SIGNAL 03 — KEYSTROKE DYNAMICS
// ============================================================
// ============================================================
// TYPING KEY FILTER
// Returns true only for printable single-character keys that
// represent genuine typing intent and are not modifier combos.
// Modifier-held combos (Ctrl+V, Cmd+A …) are excluded so paste
// shortcuts do not pollute the rhythm sample.
// ============================================================
const EXCLUDED_KEYS = new Set([
  'Backspace', 'Delete',
  'Shift', 'Control', 'Alt', 'Meta', 'AltGraph',
  'CapsLock', 'Tab', 'Escape', 'Enter',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End', 'PageUp', 'PageDown', 'Insert',
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
  'ContextMenu', 'Pause', 'ScrollLock', 'PrintScreen',
  'NumLock', 'Dead', 'Unidentified'
]);

function isPrintableTypingKey(e) {
  if (!e || e.repeat || e.isComposing) return false;
  if (EXCLUDED_KEYS.has(e.key)) return false;
  // Must be a single visible character (space counts)
  if (e.key.length !== 1) return false;
  // Exclude modifier-held combos such as Ctrl+A, Cmd+C
  if (e.ctrlKey || e.metaKey) return false;
  return true;
}

// ============================================================
// SIGNAL 03 — KEYSTROKE DYNAMICS
// ============================================================
function initTypingTask() {
  const state   = ExpState.signals.typing;
  state.keyIntervals  = [];
  state.lastKeyTime   = null;
  state.lastInputLen  = 0;   // used to detect paste / autocomplete bursts
  state.typed         = '';
  state.isComposing   = false;

  // Render target phrase with char spans
  const display = document.getElementById('typing-phrase-display');
  if (display) {
    display.innerHTML = state.phrase.split('').map((ch, i) =>
      `<span class="tp-char" id="tc-${i}">${ch === ' ' ? '&thinsp;&thinsp;' : ch}</span>`
    ).join('');
  }

  const progress = document.getElementById('typing-progress-bar');
  if (progress) progress.style.width = '0%';

  const input = document.getElementById('typing-input');
  if (input) {
    input.value    = '';
    input.disabled = false;

    // Remove old listeners before adding
    input.replaceWith(input.cloneNode(true));
    const fresh = document.getElementById('typing-input');

    // IME Composition tracking
    fresh.addEventListener('compositionstart', () => {
      state.isComposing = true;
      state.lastKeyTime = null;
    });
    fresh.addEventListener('compositionend', () => {
      state.isComposing = false;
      state.lastKeyTime = null;
    });

    // Explicit Paste handler
    fresh.addEventListener('paste', () => {
      if (state.keyIntervals.length > 0) state.keyIntervals.pop();
      state.lastKeyTime = null;
    });

    fresh.addEventListener('keydown', (e) => {
      if (state.isComposing || e.isComposing || e.repeat) return;
      const now = performance.now();

      // ── Correction keys: pop the last recorded interval so that
      //    fixing a typo does not inflate the sample.
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (state.keyIntervals.length > 0) {
          state.keyIntervals.pop();
        }
        // Reset timing anchor — the correction itself is not measured
        state.lastKeyTime = null;
        return;
      }

      // ── Skip every non-printable / modifier key
      if (!isPrintableTypingKey(e)) return;

      // ── Record interval only between consecutive printable presses
      if (state.lastKeyTime !== null) {
        state.keyIntervals.push(now - state.lastKeyTime);
      }
      state.lastKeyTime = now;
    });

    fresh.addEventListener('input', (e) => {
      const typed  = e.target.value;
      const phrase = state.phrase;
      state.typed  = typed;

      // ── Paste / autocomplete / IME burst detection:
      //    If the character count jumped by more than 1, or inputType indicates paste/replacement,
      //    discard any pending timing interval and reset timing anchor.
      const currentLen = typed.length;
      const delta      = currentLen - state.lastInputLen;
      const now        = performance.now();
      const isPasteOrFill = delta > 1 || (e.inputType && e.inputType.startsWith('insertFromPaste'));
      
      if (isPasteOrFill) {
        if (state.keyIntervals.length > 0) state.keyIntervals.pop();
        state.lastKeyTime = null;
      } else if (delta < 0) {
        // Bulk delete (select-all + delete, etc.) — same treatment
        state.lastKeyTime = null;
      } else if (delta === 1 && !state.isComposing) {
        // Mobile fallback: if keydown didn't record lastKeyTime (e.g., e.key was 'Unidentified'),
        // record timing from input events.
        if (state.lastKeyTime !== null && state.keyIntervals.length === 0) {
          // state.lastKeyTime was already timestamped by keydown
        } else if (state.lastKeyTime === null) {
          state.lastKeyTime = now;
        }
      }
      state.lastInputLen = currentLen;

      for (let i = 0; i < phrase.length; i++) {
        const span = document.getElementById(`tc-${i}`);
        if (!span) continue;
        if (i < typed.length) {
          span.className = typed[i] === phrase[i] ? 'tp-char tp-char--ok' : 'tp-char tp-char--err';
        } else if (i === typed.length) {
          span.className = 'tp-char tp-char--cursor';
        } else {
          span.className = 'tp-char';
        }
      }

      const pct = Math.min((typed.length / phrase.length) * 100, 100);
      const pb  = document.getElementById('typing-progress-bar');
      if (pb) pb.style.width = `${pct}%`;

      // Complete when phrase is fully typed with >= 90% accuracy
      const correct = [...typed].filter((c, i) => c === phrase[i]).length;
      if (typed.length >= phrase.length * 0.9 && correct >= phrase.length * 0.85) {
        e.target.disabled = true;
        // BUG-06: Show visual feedback before phase transition so the change isn't sudden
        const pb = document.getElementById('typing-progress-bar');
        if (pb) {
          pb.style.width = '100%';
          pb.style.background = 'linear-gradient(90deg, #00ff87, #00f0ff)';
        }
        e.target.placeholder = 'Input registered — preparing summary…';
        const analyzeTid = setTimeout(() => showPhase('analyzing'), 900);
        ActiveListeners.addTimeout(analyzeTid);
      }
    });

    // BUG-03: Direct focus — without setTimeout so Safari honours it where possible.
    // iOS still requires a user gesture; the input field tap-area handles the rest.
    fresh.focus();
  }
}

// ============================================================
// ANALYZING PHASE
// ============================================================
function initAnalyzing() {
  const summary = deriveEducationalSignalSummary();
  if (!summary) {
    resetToWelcome();
    return;
  }
  ExpState.result = summary;

  const isReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const delay = isReducedMotion ? 50 : 1200;

  const advanceTid = setTimeout(() => showPhase('result'), delay);
  ActiveListeners.addTimeout(advanceTid);
}

// ============================================================
// EDUCATIONAL SIGNAL SUMMARY DERIVATION (local, deterministic, fail-closed)
// ============================================================
function deriveEducationalSignalSummary() {
  const s = ExpState.signals;
  if (!s || typeof s !== 'object') return null;

  // 1. REACTION TIMING
  let reactionStatus = null;
  let reactionDesc = null;
  const reactionLimitation = 'Display, browser, device and input latency affect this session measurement. It does not establish whether someone is human.';

  if (s.reaction && s.reaction.accessibleAlternative === true) {
    reactionStatus = 'Excluded';
    reactionDesc = 'The visual reaction task was bypassed using the accessible alternative.';
  } else if (s.reaction && Array.isArray(s.reaction.times)) {
    const times = s.reaction.times;
    if (times.length === 0) return null;
    const allFinite = times.every(t => typeof t === 'number' && Number.isFinite(t) && t > 0);
    if (!allFinite) return null;

    const validTimes = times.filter(t => t <= 5000);
    if (validTimes.length >= 3) {
      reactionStatus = 'Available';
      reactionDesc = 'Reaction timing samples were captured during the completed task.';
    } else if (validTimes.length === 2) {
      reactionStatus = 'Limited';
      reactionDesc = 'The captured reaction timing information was constrained during this session.';
    } else {
      return null;
    }
  } else {
    return null;
  }

  // 2. MOVEMENT TRACKING
  let movementStatus = null;
  let movementDesc = null;
  const movementLimitation = 'Point count and timing depend on the input device and browser sampling behavior. They are not a biometric identity or humanity assessment.';

  if (s.movement && Array.isArray(s.movement.points)) {
    const pts = s.movement.points;
    if (pts.length < 10) return null;

    let prevT = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.t !== 'number' ||
          !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.t)) {
        return null;
      }
      if (p.t <= prevT) return null;
      prevT = p.t;
    }

    if (pts.length >= 15) {
      movementStatus = 'Available';
      movementDesc = 'Movement tracking samples were captured during the completed task.';
    } else {
      movementStatus = 'Limited';
      movementDesc = 'The captured movement tracking information was limited during this session.';
    }
  } else {
    return null;
  }

  // 3. TYPING RHYTHM
  let typingStatus = null;
  let typingDesc = null;
  const typingLimitation = 'Input timing depends on keyboard, language, input method and familiarity. It does not establish identity or humanity.';

  if (s.typing && typeof s.typing === 'object' && Array.isArray(s.typing.keyIntervals)) {
    const tState = s.typing;
    const phrase = tState.phrase || 'human presence is not proof of identity';
    const typed = typeof tState.typed === 'string' ? tState.typed : '';

    const correct = [...typed].filter((c, i) => c === phrase[i]).length;
    const isPhraseComplete = typed.length >= phrase.length * 0.9 && correct >= phrase.length * 0.85;
    if (!isPhraseComplete) return null;

    const intervals = tState.keyIntervals;
    for (const iv of intervals) {
      if (typeof iv !== 'number' || !Number.isFinite(iv) || iv <= 0) {
        return null;
      }
    }

    if (intervals.length >= 4) {
      typingStatus = 'Available';
      typingDesc = 'Typing rhythm information was captured during phrase completion.';
    } else {
      typingStatus = 'Limited';
      typingDesc = 'Text entry was completed without sufficient discrete keystroke timing information.';
    }
  } else {
    return null;
  }

  return {
    type: 'EDUCATIONAL_SIGNAL_SUMMARY',
    channels: [
      {
        id: 'reaction',
        name: 'Reaction Timing',
        status: reactionStatus,
        description: reactionDesc,
        limitation: reactionLimitation
      },
      {
        id: 'movement',
        name: 'Movement Tracking',
        status: movementStatus,
        description: movementDesc,
        limitation: movementLimitation
      },
      {
        id: 'typing',
        name: 'Typing Rhythm',
        status: typingStatus,
        description: typingDesc,
        limitation: typingLimitation
      }
    ],
    privacy: {
      browser_local: true,
      stored: false,
      transmitted: false
    }
  };
}

// ============================================================
// RESULT PHASE
// ============================================================
function initResult() {
  const summary = ExpState.result || deriveEducationalSignalSummary();
  if (!summary || !Array.isArray(summary.channels)) {
    resetToWelcome();
    return;
  }
  ExpState.result = summary;

  // 1. Announce in result live region (non-numeric, no aggregate rating)
  const liveRegion = document.getElementById('result-aria-announcer');
  if (liveRegion) {
    liveRegion.textContent = 'Educational session signal summary complete. Signal channels are displayed below.';
  }

  // 2. Bind 3 educational signal cards
  summary.channels.forEach(ch => {
    const statusEl = document.getElementById(`res-status-${ch.id}`);
    const obsEl = document.getElementById(`res-obs-${ch.id}`);
    const limitEl = document.getElementById(`res-limitation-${ch.id}`);

    if (statusEl) {
      statusEl.textContent = ch.status;
      statusEl.className = 'signal-status-badge ' + (
        ch.status === 'Available' ? 'status--available' :
        ch.status === 'Excluded' ? 'status--excluded' : 'status--limited'
      );
    }

    if (obsEl) {
      obsEl.textContent = ch.description;
    }

    if (limitEl) {
      limitEl.textContent = ch.limitation;
    }
  });

  // 3. Focus management: move focus to result heading
  const resHeading = document.querySelector('#phase-result h2');
  if (resHeading) {
    resHeading.setAttribute('tabindex', '-1');
    resHeading.focus();
  }

  // 4. Restart button handler with clean state teardown and focus restoration
  const restartBtn = document.getElementById('result-restart-btn');
  if (restartBtn) {
    restartBtn.onclick = () => {
      // Clear all prior state
      ExpState.isSessionActive = false;
      ExpState.signals.reaction = { round: 0, times: [], status: 'idle', timeoutId: null, startTime: null, accessibleAlternative: false };
      ExpState.signals.movement = { points: [], collecting: false, timeRemaining: 5 };
      ExpState.signals.typing = { phrase: 'human presence is not proof of identity', keyIntervals: [], lastKeyTime: null, typed: '' };
      ExpState.result = null;

      // Clear movement canvas
      const movCanvas = document.getElementById('movement-canvas');
      if (movCanvas) {
        const ctx2d = movCanvas.getContext('2d');
        if (ctx2d) ctx2d.clearRect(0, 0, movCanvas.width, movCanvas.height);
      }

      // Transition to welcome
      showPhase('welcome');

      // Focus management: move focus to start button on welcome screen
      requestAnimationFrame(() => {
        const startBtn = document.getElementById('exp-begin-btn');
        if (startBtn) {
          startBtn.focus();
        } else {
          const welcomeHeading = document.querySelector('#phase-welcome h1, #phase-welcome h2');
          if (welcomeHeading) {
            welcomeHeading.setAttribute('tabindex', '-1');
            welcomeHeading.focus();
          }
        }
      });
    };
  }
}

// ============================================================
// UTILITIES
// ============================================================
function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ============================================================
// CANVAS BACKGROUND (reuse homepage particle system if available)
// ============================================================
function initCanvasBg() {
  const canvas = document.getElementById('canvas-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const particles = [];

  const resize = () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 55; i++) {
    particles.push({
      x:   Math.random() * window.innerWidth,
      y:   Math.random() * window.innerHeight,
      vx:  (Math.random() - 0.5) * 0.35,
      vy:  (Math.random() - 0.5) * 0.35,
      r:   Math.random() * 1.4 + 0.4,
      a:   Math.random() * 0.45 + 0.08
    });
  }

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,240,255,${p.a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

// ============================================================
// MOBILE HAMBURGER & ACCESSIBLE FOCUS TRAP
// ============================================================
function initMobileNav() {
  const toggle = document.querySelector('.mobile-nav-toggle');
  const nav    = document.querySelector('.main-nav');
  if (!toggle || !nav) return;

  const getFocusableControls = () => {
    const links = Array.from(nav.querySelectorAll("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"));
    return [toggle, ...links];
  };

  const openNav = () => {
    toggle.setAttribute('aria-expanded', 'true');
    toggle.classList.add('is-open');
    nav.classList.add('active');
    document.body.classList.add('nav-open');
    const firstLink = nav.querySelector('.nav-link');
    if (firstLink) {
      firstLink.focus();
    }
  };

  const closeNav = (returnFocus = true) => {
    if (!nav.classList.contains('active')) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.remove('is-open');
    nav.classList.remove('active');
    document.body.classList.remove('nav-open');
    if (returnFocus) {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    if (open) {
      closeNav(true);
    } else {
      openNav();
    }
  });

  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
      closeNav(false);
    });
  });

  // Focus trap and Escape key handler
  document.addEventListener('keydown', (e) => {
    if (!nav.classList.contains('active')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeNav(true);
      return;
    }

    if (e.key === 'Tab') {
      const controls = getFocusableControls();
      if (controls.length === 0) return;

      const firstControl = controls[0];
      const lastControl = controls[controls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstControl || !nav.contains(document.activeElement) && document.activeElement !== toggle) {
          e.preventDefault();
          lastControl.focus();
        }
      } else {
        if (document.activeElement === lastControl) {
          e.preventDefault();
          firstControl.focus();
        }
      }
    }
  });

  // Reset state cleanly if resized to desktop viewport
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && nav.classList.contains('active')) {
      closeNav(false);
    }
  });
}

// ============================================================
// HEADER SCROLL BEHAVIOUR
// ============================================================
function initHeaderScroll() {
  const header = document.querySelector('.app-header');
  if (!header) return;
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('header-scrolled', y > 20);
    lastY = y;
  }, { passive: true });
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initCanvasBg();
  initMobileNav();
  initSkipNavigation();
  initHeaderScroll();

  const initialHash = window.location.hash;
  const targetPhase = initialHash ? getPhaseFromHash(initialHash) : 'welcome';

  if (targetPhase !== 'welcome' && !hasValidStateForPhase(targetPhase)) {
    resetToWelcome();
  } else {
    showPhase(targetPhase);
    if (!initialHash) {
      history.replaceState({ phase: 'welcome' }, '', window.location.pathname + window.location.search);
    }
  }

  window.addEventListener('popstate', (e) => {
    const phase = (e.state && e.state.phase) || getPhaseFromHash(window.location.hash);
    if (phase) {
      if (hasValidStateForPhase(phase)) {
        showPhase(phase, false);
      } else {
        resetToWelcome();
      }
    }
  });

  // Welcome → Instructions
  const beginBtn = document.getElementById('exp-begin-btn');
  if (beginBtn) {
    beginBtn.addEventListener('click', () => {
      ExpState.isSessionActive = true;
      showPhase('instructions');
    });
  }

  // Instructions → Task 1
  const startBtn = document.getElementById('exp-start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      ExpState.isSessionActive = true;
      showPhase('task-reaction');
    });
  }
});

// ============================================================
// v0.4 — SKIP NAVIGATION (router-safe, standalone)
// ============================================================
function initSkipNavigation() {
  const expSkip = document.getElementById('exp-skip-link');
  if (!expSkip) return;
  expSkip.addEventListener('click', (e) => {
    e.preventDefault();
    // Target heading inside the currently active phase (.exp-phase--active)
    const activePhase = document.querySelector('.exp-phase--active');
    const heading = activePhase ? activePhase.querySelector('h2, h3') : null;
    const target  = heading || activePhase || document.querySelector('main');
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: false });
    }
    // window.location.hash is intentionally NOT modified
  });
}
