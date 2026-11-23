/* RedirectedStepper project page — small, dependency-free behaviours. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ── Top bar border on scroll ─────────────────────────────────────────── */
  var topbar = document.getElementById('topbar');
  function onScroll() {
    if (topbar) topbar.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Reveal on scroll (with a gentle stagger among siblings) ──────────── */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  revealEls.forEach(function (el) {
    var siblings = Array.prototype.filter.call(el.parentNode.children, function (c) {
      return c.hasAttribute('data-reveal');
    });
    var i = siblings.indexOf(el);
    if (i > 0) el.style.transitionDelay = Math.min(i, 4) * 80 + 'ms';
  });
  if (!hasIO || reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          revealIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  }

  /* ── Looping demo videos: play only while on screen ───────────────────── */
  var loops = Array.prototype.slice.call(document.querySelectorAll('video.loop'));
  if (reduceMotion) {
    loops.forEach(function (v) {
      v.removeAttribute('autoplay');
      v.pause();
      v.controls = true;
    });
  } else if (hasIO) {
    var videoIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          var p = v.play();
          if (p && p.catch) p.catch(function () { /* autoplay blocked: poster stays */ });
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });
    loops.forEach(function (v) { videoIO.observe(v); });
  }

  /* ── Optional YouTube embed for the full video ────────────────────────── */
  var full = document.querySelector('.full-video[data-youtube]');
  if (full) {
    var ytId = (full.getAttribute('data-youtube') || '').trim();
    if (/^[\w-]{6,}$/.test(ytId)) {
      var frame = full.querySelector('.frame');
      frame.innerHTML = '';
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + ytId + '?rel=0';
      iframe.title = 'RedirectedStepper video';
      iframe.loading = 'lazy';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      frame.appendChild(iframe);
    }
  }

  /* ── Copy BibTeX ──────────────────────────────────────────────────────── */
  var copyBtn = document.getElementById('copyBib');
  var bib = document.getElementById('bib');
  if (copyBtn && bib) {
    var label = copyBtn.querySelector('.copy-label');
    copyBtn.addEventListener('click', function () {
      var text = bib.innerText.trim();
      var done = function () {
        label.textContent = 'Copied';
        setTimeout(function () { label.textContent = 'Copy'; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
      function fallback() {
        var range = document.createRange();
        range.selectNodeContents(bib);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        try { document.execCommand('copy'); done(); } catch (err) { /* text stays selected */ }
      }
    });
  }

  /* ── "One step, redirected" illustration ──────────────────────────────── */
  var stage = document.getElementById('stage');
  if (stage) initStage(stage);

  function initStage(root) {
    var $ = function (id) { return document.getElementById(id); };
    var rPedal = $('rPedal'), rShoe = $('rShoe'), rSpring = $('rSpring'), rGauge = $('rGauge');
    var vStairs = $('vStairs'), vEdges = $('vEdges'), vShoe = $('vShoe'), vTrail = $('vTrail'), vTarget = $('vTarget');
    var phaseChip = $('stagePhase'), stepCount = $('stepCount');
    var capReal = root.querySelector('[data-cap="real"]');
    var capVirtual = root.querySelector('[data-cap="virtual"]');

    var CAPTIONS = {
      lift: ['Raise your foot. The pedal rises with it.', 'Your foot arcs up and lands on the next stair.'],
      push: ['Press the pedal down against the springs.', 'You rise one step. Repeat, endlessly.']
    };

    // Real stepper (side view, walking direction → right).
    var HINGE = { x: 316, y: 222 };
    var A_LOW = 2, A_HIGH = 14;            // pedal tilt in degrees (rear end rises)
    var SHOE_ON_PEDAL = -130;              // shoe centre, measured from the hinge along the pedal
    var SPRING_X = 123, SPRING_BASE = 246;

    // Virtual staircase.
    var D = 104, H = 56;                   // tread and rise (≈ 30 cm / 16 cm)
    var X0 = 120, Y0 = 230;                // stair 0 tread starts at (X0, Y0)
    var S = 0.5;                           // virtual shoe scale
    var BASE_X = X0 + D - 8 - 96 * S;      // shoe centre on stair 0, toe just short of the riser
    var LIFT_BUMP = 24;                    // extra clearance over the stair nosing
    var C = 3;                             // curve exponent: lift first, then reach forward

    // Timeline (ms).
    var T_LIFT = 1400, T_HOLD1 = 350, T_PUSH = 1100, T_HOLD2 = 380;
    var CYCLE = T_LIFT + T_HOLD1 + T_PUSH + T_HOLD2;

    var ease = function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; };
    var rad = function (deg) { return deg * Math.PI / 180; };
    var rot = function (p, deg) {
      var a = rad(deg), c = Math.cos(a), s = Math.sin(a);
      return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
    };
    var f = function (n) { return Math.round(n * 10) / 10; };

    function liftPoint(u) {
      return {
        x: BASE_X + D * Math.pow(u, C),
        y: Y0 - (H * u + LIFT_BUMP * Math.sin(Math.PI * u))
      };
    }

    // The dashed path the virtual foot follows during one lift.
    var trailD = (function () {
      var d = '';
      for (var i = 0; i <= 40; i++) {
        var p = liftPoint(i / 40);
        d += (i ? ' L ' : 'M ') + f(p.x) + ' ' + f(p.y - 6);
      }
      return d;
    })();
    vTrail.setAttribute('d', trailD);

    function stateAt(ms) {
      var t = ms % CYCLE;
      var cycle = Math.floor(ms / CYCLE);
      if (t < T_LIFT) return { phase: 'lift', u: ease(t / T_LIFT), v: 0, cycle: cycle, landed: false };
      t -= T_LIFT;
      if (t < T_HOLD1) return { phase: 'lift', u: 1, v: 0, cycle: cycle, landed: true };
      t -= T_HOLD1;
      if (t < T_PUSH) return { phase: 'push', u: 1, v: ease(t / T_PUSH), cycle: cycle, landed: true };
      return { phase: 'push', u: 1, v: 1, cycle: cycle, landed: true };
    }

    var lastPhase = null;

    function render(ms) {
      var st = stateAt(ms);
      var lifting = st.phase === 'lift';
      var uReal = lifting ? st.u : 1 - st.v;

      /* Real world */
      var a = A_LOW + (A_HIGH - A_LOW) * uReal;
      rPedal.setAttribute('transform', 'translate(' + HINGE.x + ' ' + HINGE.y + ') rotate(' + f(a) + ')');
      rShoe.setAttribute('transform', 'translate(' + HINGE.x + ' ' + HINGE.y + ') rotate(' + f(a) + ') translate(' + SHOE_ON_PEDAL + ' -6)');

      var top = rot({ x: SPRING_X - HINGE.x, y: 6 }, a);
      var springTop = HINGE.y + top.y;
      var coils = 7, pts = [SPRING_X + ',' + SPRING_BASE];
      for (var i = 1; i < coils * 2; i++) {
        var y = SPRING_BASE + (springTop - SPRING_BASE) * (i / (coils * 2));
        pts.push(f(SPRING_X + (i % 2 ? -10 : 10)) + ',' + f(y));
      }
      pts.push(SPRING_X + ',' + f(springTop));
      rSpring.setAttribute('points', pts.join(' '));

      var gh = 90 * uReal;
      rGauge.setAttribute('y', f(240 - gh));
      rGauge.setAttribute('height', f(gh));

      /* Virtual world */
      var camX = D * st.v, camY = H * st.v;
      var xs = function (i) { return X0 + i * D - camX; };
      var ys = function (i) { return Y0 - i * H + camY; };
      var edge = 'M ' + f(xs(-3)) + ' ' + f(ys(-3));
      for (var k = -3; k <= 5; k++) edge += ' L ' + f(xs(k + 1)) + ' ' + f(ys(k)) + ' L ' + f(xs(k + 1)) + ' ' + f(ys(k + 1));
      vEdges.setAttribute('d', edge);
      vStairs.setAttribute('d', edge + ' L ' + f(xs(6)) + ' 320 L ' + f(xs(-3)) + ' 320 Z');

      vTarget.setAttribute('x1', f(xs(1) + 6));
      vTarget.setAttribute('x2', f(xs(2) - 6));
      vTarget.setAttribute('y1', f(ys(1)));
      vTarget.setAttribute('y2', f(ys(1)));
      vTarget.style.opacity = lifting ? (0.25 + 0.75 * st.u).toFixed(2) : (1 - st.v).toFixed(2);

      vTrail.setAttribute('transform', 'translate(' + f(-camX) + ' ' + f(camY) + ')');
      vTrail.style.opacity = lifting ? '1' : (1 - st.v).toFixed(2);

      var p, pitch;
      if (lifting) {
        p = liftPoint(st.u);
        pitch = -16 * Math.sin(Math.PI * st.u);          // toe up while swinging
      } else {
        p = { x: BASE_X + D - camX, y: Y0 - H + camY };
        pitch = 0;
      }
      vShoe.setAttribute('transform', 'translate(' + f(p.x) + ' ' + f(p.y) + ') rotate(' + f(pitch) + ') scale(' + S + ')');

      stepCount.textContent = String(st.cycle + (st.landed ? 2 : 1));

      if (st.phase !== lastPhase) {
        lastPhase = st.phase;
        phaseChip.textContent = lifting ? 'Lift' : 'Push';
        phaseChip.classList.toggle('is-push', !lifting);
        swapCaption(capReal, CAPTIONS[st.phase][0]);
        swapCaption(capVirtual, CAPTIONS[st.phase][1]);
      }
    }

    function swapCaption(el, text) {
      if (!el) return;
      if (!el.textContent || reduceMotion) { el.textContent = text; return; }
      el.classList.add('is-swapping');
      setTimeout(function () { el.textContent = text; el.classList.remove('is-swapping'); }, 220);
    }

    if (reduceMotion) {
      render(T_LIFT * 0.62);
      return;
    }

    var elapsed = 0, last = null, running = false, visible = false, rafId = 0;

    function frame(now) {
      if (last !== null) elapsed += Math.min(now - last, 50);
      last = now;
      render(elapsed);
      rafId = requestAnimationFrame(frame);
    }
    function start() {
      if (running) return;
      running = true; last = null;
      rafId = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }
    function sync() {
      if (visible && !document.hidden) start(); else stop();
    }

    render(0);
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        sync();
      }, { threshold: 0.15 }).observe(root);
    } else {
      visible = true;
    }
    document.addEventListener('visibilitychange', sync);
    sync();
  }
})();
