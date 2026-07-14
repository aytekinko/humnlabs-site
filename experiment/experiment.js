/**
 * Human Presence Experiment v0.1 â€” HUMNLABS
 * All signal collection and scoring runs entirely in the browser.
 * No data is transmitted to any server.
 */

'use strict';

// ============================================================
// STATE
// ============================================================
const ExpState = {
  currentPhase: 'welcome',
  signals: {
    reaction: { round: 0, times: [], status: 'idle', timeoutId: null, startTime: null, score: 0 },
    movement: { points: [], collecting: false, timeRemaining: 5, score: 0 },
    typing:   { phrase: 'human presence is not proof of identity', keyIntervals: [], lastKeyTime: null, typed: '', score: 0 }
  },
  result: { reaction: 0, movement: 0, typing: 0, overall: 0 }
};

// ============================================================
// PHASE MANAGEMENT
// ============================================================
function showPhase(name) {
  document.querySelectorAll('.exp-phase').forEach(el => {
    el.classList.remove('exp-phase--active');
  });

  const target = document.getElementById(`phase-${name}`);
  if (target) {
    requestAnimationFrame(() => {
      target.classList.add('exp-phase--active');
    });
  }

  ExpState.currentPhase = name;
  updateProgress(name);

  // ARIA Live Announcement for phase transitions
  const announcer = document.getElementById('exp-aria-announcer');
  if (announcer) {
    const screenFriendlyNames = {
      'welcome': 'Welcome to Human Presence Experiment v0.1',
      'instructions': 'Instructions phase. Learn how behavioral signal collection works.',
      'task-reaction': 'Task 1: Reaction timing assessment. Click target when Now appears.',
      'task-movement': 'Task 2: Movement analysis assessment. Draw lines inside the movement area.',
      'task-typing': 'Task 3: Keystroke analysis assessment. Type the phrase shown in input field.',
      'analyzing': 'Processing collected signals. Running analysis engine.',
      'result': 'Experiment complete. Reviewing behavioral confidence results.'
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
  if (init) setTimeout(init, 50);
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
// SIGNAL 01 â€” REACTION TIMING
// ============================================================
function initReactionTask() {
  const state   = ExpState.signals.reaction;
  state.round   = 0;
  state.times   = [];
  state.status  = 'idle';

  const list = document.getElementById('reaction-results');
  if (list) list.innerHTML = '';

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
  state.timeoutId = setTimeout(() => {
    if (ExpState.currentPhase !== 'task-reaction') return;
    state.status     = 'go';
    state.startTime  = performance.now();
    target.dataset.state = 'go';
    target.innerHTML = `<span class="rt-inner-text">NOW!</span>`;
    target.onclick   = handleReactionClick;
  }, delay);
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
    setTimeout(() => {
      if (ExpState.currentPhase !== 'task-reaction') return;
      if (target) {
        target.dataset.state = 'idle';
        target.innerHTML     = '';
      }
      setTimeout(startReactionRound, 400);
    }, 900);
  } else {
    if (target) {
      target.dataset.state = 'done';
      target.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="40" height="40"><polyline points="20 6 9 17 4 12"/></svg>`;
    }
    setTimeout(() => showPhase('task-movement'), 1600);
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
// SIGNAL 02 â€” MOVEMENT ANALYSIS
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

  // Size canvas
  const zone = document.getElementById('movement-zone');
  if (canvas && zone) {
    canvas.width  = zone.clientWidth  || 300;
    canvas.height = zone.clientHeight || 200;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (startBtn) {
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

  zone.addEventListener('mousemove', onMouse);
  zone.addEventListener('touchmove', onTouch, { passive: false });
  window.addEventListener('keydown', onKey);

  const tick = setInterval(() => {
    if (!state.collecting) { clearInterval(tick); return; }
    state.timeRemaining--;
    if (timerEl) timerEl.textContent = state.timeRemaining > 0 ? state.timeRemaining : 'âœ“';

    if (state.timeRemaining <= 0) {
      clearInterval(tick);
      state.collecting = false;
      zone.removeEventListener('mousemove', onMouse);
      zone.removeEventListener('touchmove', onTouch);
      window.removeEventListener('keydown', onKey);
      setTimeout(() => showPhase('task-typing'), 1000);
    }
  }, 1000);
}

// ============================================================
// SIGNAL 03 â€” KEYSTROKE DYNAMICS
// ============================================================
function initTypingTask() {
  const state   = ExpState.signals.typing;
  state.keyIntervals = [];
  state.lastKeyTime  = null;
  state.typed        = '';

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

    fresh.addEventListener('keydown', (e) => {
      const now = performance.now();
      if (state.lastKeyTime !== null) {
        state.keyIntervals.push(now - state.lastKeyTime);
      }
      state.lastKeyTime = now;
    });

    fresh.addEventListener('input', (e) => {
      const typed  = e.target.value;
      const phrase = state.phrase;
      state.typed  = typed;

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
        setTimeout(() => showPhase('analyzing'), 700);
      }
    });

    setTimeout(() => fresh.focus(), 100);
  }
}

// ============================================================
// ANALYZING PHASE
// ============================================================
function initAnalyzing() {
  const scores = calculateAllScores();
  ExpState.result = scores;

  // Reset bars
  ['1','2','3'].forEach(i => {
    const bar = document.getElementById(`analyze-bar-${i}`);
    const val = document.getElementById(`analyze-val-${i}`);
    if (bar) bar.style.width = '0%';
    if (val) val.textContent = '0%';
  });

  const signal = [
    { bar: 'analyze-bar-1', val: 'analyze-val-1', score: scores.reaction },
    { bar: 'analyze-bar-2', val: 'analyze-val-2', score: scores.movement },
    { bar: 'analyze-bar-3', val: 'analyze-val-3', score: scores.typing },
  ];

  signal.forEach((s, idx) => {
    setTimeout(() => {
      const bar = document.getElementById(s.bar);
      const val = document.getElementById(s.val);
      if (bar) bar.style.width = `${s.score}%`;
      if (val) animateCount(val, 0, s.score, 900);
    }, 350 + idx * 700);
  });

  // Advance to result
  setTimeout(() => showPhase('result'), 3600);
}

// ============================================================
// SCORING ENGINE (local, deterministic)
// ============================================================
function calculateAllScores() {
  const r = scoreReaction(ExpState.signals.reaction.times);
  const m = scoreMovement(ExpState.signals.movement.points);
  const t = scoreTyping(ExpState.signals.typing.keyIntervals);
  const overall = clamp(Math.round(r * 0.33 + m * 0.34 + t * 0.33), 22, 97);
  return { reaction: r, movement: m, typing: t, overall };
}

function scoreReaction(times) {
  const hasInvalid = times.some(t => t > 5000);
  if (hasInvalid) return 24; // Minimum score for invalid timing

  if (times.length < 2) return 62;
  const mean = avg(times);
  const cv   = stdDev(times) / (mean + 1);
  let s = 48;
  if (mean >= 130 && mean <= 450) s += 25;
  else if (mean >= 80 && mean <= 650) s += 12;
  if (cv >= 0.05 && cv <= 0.45) s += 22;
  else if (cv >= 0.01 && cv <= 0.70) s += 10;
  if (mean < 100) s -= 30;
  return clamp(Math.round(s), 24, 97);
}

function scoreMovement(points) {
  if (points.length < 15) return 58;
  let dirChanges = 0, velocities = [];
  for (let i = 1; i < points.length - 1; i++) {
    const dx1 = points[i].x - points[i-1].x,  dy1 = points[i].y - points[i-1].y;
    const dx2 = points[i+1].x - points[i].x,  dy2 = points[i+1].y - points[i].y;
    let diff = Math.abs(Math.atan2(dy2, dx2) - Math.atan2(dy1, dx1));
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff > 0.12) dirChanges++;
    const dt = points[i].t - points[i-1].t;
    if (dt > 0) velocities.push(Math.hypot(dx1, dy1) / dt);
  }
  const dirRate = dirChanges / points.length;
  const avgVel = velocities.length ? avg(velocities) : 0;
  const velCV  = velocities.length ? stdDev(velocities) / (avgVel + 0.001) : 0;
  
  let s = 48;
  
  // Penalize uniform velocity (typical of pre-programmed macros)
  if (velCV < 0.12) {
    s -= 20;
  } else if (velCV >= 0.3) {
    s += 20;
  } else if (velCV >= 0.08) {
    s += 10;
  }
  
  // Direction rate validation
  if (dirRate >= 0.08 && dirRate <= 0.65) {
    s += 26;
  } else if (dirRate > 0 && dirRate < 0.8) {
    s += 12;
  } else if (dirRate >= 0.8) {
    // Extreme frequency pointer shakes/scribbles
    s -= 25;
  }
  
  // Unnaturally high speed penalty
  if (avgVel > 7.5) {
    s -= 20;
  }

  return clamp(Math.round(s), 28, 97);
}

function scoreTyping(intervals) {
  if (intervals.length < 4) return 63;
  const mean = avg(intervals);
  const cv   = stdDev(intervals) / (mean + 1);
  let s = 48;
  if (mean >= 70 && mean <= 380) s += 26;
  else if (mean >= 40 && mean <= 600) s += 12;
  if (cv >= 0.18 && cv <= 0.90) s += 22;
  else if (cv >= 0.05 && cv <= 1.3) s += 10;
  return clamp(Math.round(s), 28, 97);
}

// ============================================================
// RESULT PHASE
// ============================================================
function initResult() {
  const { reaction, movement, typing, overall } = ExpState.result;

  // Circular SVG progress
  const circle = document.getElementById('result-circle-progress');
  const scoreEl = document.getElementById('result-score-num');
  if (circle) {
    const r = 54, circ = 2 * Math.PI * r;
    circle.style.strokeDasharray  = circ;
    circle.style.strokeDashoffset = circ;
    // Color by score
    const color = overall >= 70 ? '#00F0FF' : overall >= 50 ? '#f59e0b' : '#ef4444';
    circle.style.stroke = color;
    setTimeout(() => {
      circle.style.transition      = 'stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1)';
      circle.style.strokeDashoffset = circ - (overall / 100) * circ;
    }, 150);
  }
  if (scoreEl) animateCount(scoreEl, 0, overall, 1600);

  // Score label
  const labelEl = document.getElementById('result-score-label');
  if (labelEl) {
    labelEl.textContent =
      overall >= 70 ? 'High Confidence' :
      overall >= 50 ? 'Moderate Confidence' : 'Low Confidence';
    labelEl.className = 'result-score-label ' + (
      overall >= 70 ? 'label--high' : overall >= 50 ? 'label--mid' : 'label--low'
    );
  }

  // Signal bars
  const sigs = [
    { bar: 'res-bar-r', val: 'res-val-r', score: reaction },
    { bar: 'res-bar-m', val: 'res-val-m', score: movement },
    { bar: 'res-bar-t', val: 'res-val-t', score: typing   },
  ];
  sigs.forEach((s, i) => {
    const bar = document.getElementById(s.bar);
    const val = document.getElementById(s.val);
    if (bar) { bar.style.width = '0%'; setTimeout(() => { bar.style.width = `${s.score}%`; }, 700 + i * 180); }
    if (val) setTimeout(() => animateCount(val, 0, s.score, 700), 700 + i * 180);
  });

  // Contextual message
  const msgEl = document.getElementById('result-message');
  if (msgEl) {
    msgEl.textContent =
      overall >= 75 ? 'The behavioral signals observed in this session show patterns strongly consistent with human interaction.' :
      overall >= 55 ? 'The behavioral signals show patterns consistent with human interaction, with moderate confidence.' :
                      'The behavioral signals show limited patterns of typical human behavior in this session.';
  }

  // Explainability dynamic ratings
  const getRating = (score) => {
    if (score >= 75) return { text: 'High', class: 'high' };
    if (score >= 55) return { text: 'Moderate', class: 'moderate' };
    return { text: 'Low', class: 'low' };
  };

  const ratings = [
    { elId: 'exp-badge-r', score: reaction },
    { elId: 'exp-badge-m', score: movement },
    { elId: 'exp-badge-t', score: typing },
  ];

  ratings.forEach(r => {
    const el = document.getElementById(r.elId);
    if (el) {
      const info = getRating(r.score);
      el.textContent = info.text;
      el.className = `explainability-badge explainability-badge--${info.class}`;
    }
  });

  // Restart button
  const restartBtn = document.getElementById('result-restart-btn');
  if (restartBtn) {
    restartBtn.onclick = () => {
      // Reset all state
      ExpState.signals.reaction = { round: 0, times: [], status: 'idle', timeoutId: null, startTime: null, score: 0 };
      ExpState.signals.movement = { points: [], collecting: false, timeRemaining: 5, score: 0 };
      ExpState.signals.typing   = { phrase: 'human presence is not proof of identity', keyIntervals: [], lastKeyTime: null, typed: '', score: 0 };
      ExpState.result           = { reaction: 0, movement: 0, typing: 0, overall: 0 };
      
      // Reset explainability badges
      ['r', 'm', 't'].forEach(id => {
        const badge = document.getElementById(`exp-badge-${id}`);
        if (badge) {
          badge.textContent = 'â€”';
          badge.className = 'explainability-badge';
        }
      });

      showPhase('welcome');
    };
  }
}

// ============================================================
// UTILITIES
// ============================================================
function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stdDev(arr) {
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function animateCount(el, from, to, duration) {
  const start = performance.now();
  const step  = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = `${Math.round(from + (to - from) * e)}%`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
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
// MOBILE HAMBURGER (reuse homepage script pattern)
// ============================================================
function initMobileNav() {
  const toggle = document.querySelector('.mobile-nav-toggle');
  const nav    = document.querySelector('.main-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.classList.toggle('is-open', !open);
    nav.classList.toggle('nav-open', !open);
  });
  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.classList.remove('is-open');
      nav.classList.remove('nav-open');
    });
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
  initHeaderScroll();
  showPhase('welcome');

  // Welcome â†’ Instructions
  const beginBtn = document.getElementById('exp-begin-btn');
  if (beginBtn) beginBtn.addEventListener('click', () => showPhase('instructions'));

  // Instructions â†’ Task 1
  const startBtn = document.getElementById('exp-start-btn');
  if (startBtn) startBtn.addEventListener('click', () => showPhase('task-reaction'));
});
