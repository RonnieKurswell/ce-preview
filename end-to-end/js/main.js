import * as THREE from 'three';

/* ============================================================
   ASSET MANIFEST

   This is the only place file paths live. To add real media,
   set `src` on a slot. Leave it null to render a labelled
   placeholder tile. Video slots autoplay muted and looped.

   Paths are relative to index.html, e.g. 'media/booths/mwc-01.jpg'.
   ============================================================ */

const ASSETS = {
  concept: [
    { src: null, type: 'image', kicker: 'Figma', label: 'Wireframe route' },
    { src: null, type: 'image', kicker: 'Figma', label: 'Look and feel — concept A' },
    { src: null, type: 'image', kicker: 'Figma', label: 'Look and feel — concept B' },
    { src: null, type: 'image', kicker: 'Figma', label: 'Chosen direction' },
  ],
  booths: [
    { src: null, type: 'image', kicker: 'Barcelona', label: 'Mobile World Congress 2023' },
    { src: null, type: 'image', kicker: 'Barcelona', label: 'Mobile World Congress 2024' },
    { src: null, type: 'image', kicker: 'Orlando',   label: 'SAP Sapphire' },
    { src: null, type: 'image', kicker: 'Copenhagen', label: 'TM Forum DTW' },
    { src: null, type: 'image', kicker: 'Sydney',    label: 'Mastercard' },
  ],
  // `poster` is the still or loop shown on the card face. `href` is the live
  // demo; until it is set the card explains that the link is pending.
  demos: [
    {
      name: 'SAP',
      desc: 'AI powered warehouse fulfilment. Multi-agent, touch driven, built for Sapphire.',
      poster: null,
      posterType: 'image',
      href: null,
    },
    {
      name: 'GCC',
      desc: 'Global capability centre experience. Three-screen narrative with a live scoring game.',
      poster: null,
      posterType: 'image',
      href: null,
    },
    {
      name: 'Manufacturing',
      desc: 'Unlock AI value on the factory floor. Real-time 3D, running in the browser.',
      poster: null,
      posterType: 'image',
      href: null,
    },
  ],
  robotics: [
    { src: null, type: 'image', kicker: 'SAP Sapphire', label: 'Robot on stand' },
    { src: null, type: 'video', kicker: 'SAP Sapphire', label: 'Kiosk handoff sequence' },
    { src: null, type: 'image', kicker: 'Programme',    label: 'Arm choreography' },
  ],
  motion: [
    { src: null, type: 'video', kicker: 'MWC', label: 'Reimagine experiences' },
    { src: null, type: 'video', kicker: 'MWC', label: 'Assimilate AI' },
    { src: null, type: 'video', kicker: 'MWC', label: 'Digital infrastructure' },
    { src: null, type: 'video', kicker: 'MWC', label: 'Smart workplaces' },
    { src: null, type: 'video', kicker: 'MWC', label: 'Fluid operating models' },
  ],
};

/* ============================================================
   STAGES
   Order here drives the rail, the scroll mapping and the
   3D mood. Add or reorder stages by editing this list only.
   ============================================================ */

const STAGES = [
  { id: 'arrival',  name: 'Arrival',       accent: 'magenta', mood: 'bloom'   },
  { id: 'studio',   name: 'Studio',        accent: 'magenta', mood: 'signal'  },
  { id: 'concept',  name: 'Concept',       accent: 'magenta', mood: 'sketch'  },
  { id: 'booths',   name: 'Booths',        accent: 'cyan',    mood: 'build'   },
  { id: 'demos',    name: 'AI demos',      accent: 'orange',  mood: 'signal'  },
  { id: 'robotics', name: 'Robotics',      accent: 'cyan',    mood: 'machine' },
  { id: 'motion',   name: 'Motion',        accent: 'orange',  mood: 'panels'  },
  { id: 'contact',  name: 'Contact',       accent: 'magenta', mood: 'bloom'   },
];

const ACCENTS = {
  magenta: { hex: '#fc31b8', glowA: '#ffd9f2', glowB: '#e8d4ff' },
  cyan:    { hex: '#2de1fd', glowA: '#c9f4fb', glowB: '#d6e4ff' },
  orange:  { hex: '#ff7a00', glowA: '#ffe0c4', glowB: '#ffd4e8' },
};

const PALETTE = [0xfc31b8, 0x2de1fd, 0xff7a00, 0xa924b4, 0x3e94a6];

const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   SCENE
   One camera, one persistent cluster of panels, lines and
   spheres. Each mood re-forms the cluster rather than
   rebuilding it, which keeps transitions continuous.
   ============================================================ */

class Scene {
  constructor(mount) {
    this.mount = mount;
    this.ok = false;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (err) {
      console.warn('WebGL unavailable, running without the 3D layer.', err);
      return;
    }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    mount.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 200);
    this.camera.position.set(0, 0, 38);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(6, 10, 12);
    this.scene.add(key);

    this.pieces = [];
    this.build();

    this.pointer = new THREE.Vector2();
    this.pointerTarget = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.moodT = 0;
    this.ok = true;
    this.snapLayout();

    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', (e) => {
      this.pointerTarget.set(
        (e.clientX / innerWidth) * 2 - 1,
        (e.clientY / innerHeight) * 2 - 1
      );
    }, { passive: true });
  }

  build() {
    const rand = mulberry32(20260728);

    // Flat panels — the dominant motif.
    const panelGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 28; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: PALETTE[i % PALETTE.length],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
      });
      const m = new THREE.Mesh(panelGeo, mat);
      const w = 1.2 + rand() * 3.4;
      const h = 0.9 + rand() * 2.8;
      m.scale.set(w, h, 1);
      this.pieces.push(this.seed(m, rand, 'panel'));
      this.group.add(m);
    }

    // Hairlines — the drafting layer.
    const lineMatCache = new Map();
    for (let i = 0; i < 26; i++) {
      const color = PALETTE[i % PALETTE.length];
      if (!lineMatCache.has(color)) {
        lineMatCache.set(color, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }));
      }
      const len = 3 + rand() * 12;
      const vertical = rand() > 0.5;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(vertical ? 0 : -len / 2, vertical ? -len / 2 : 0, 0),
        new THREE.Vector3(vertical ? 0 : len / 2, vertical ? len / 2 : 0, 0),
      ]);
      const l = new THREE.Line(geo, lineMatCache.get(color));
      this.pieces.push(this.seed(l, rand, 'line'));
      this.group.add(l);
    }

    // Sphere swarm — the data layer.
    const sphereGeo = new THREE.SphereGeometry(0.17, 14, 12);
    for (let i = 0; i < 58; i++) {
      const mat = new THREE.MeshLambertMaterial({ color: PALETTE[i % PALETTE.length] });
      const s = new THREE.Mesh(sphereGeo, mat);
      const p = this.seed(s, rand, 'sphere');
      p.swarm = true;
      this.pieces.push(p);
      this.group.add(s);
    }
  }

  seed(obj, rand, kind) {
    const piece = {
      obj,
      kind,
      home: new THREE.Vector3((rand() - 0.5) * 17, (rand() - 0.5) * 15, (rand() - 0.5) * 16),
      target: new THREE.Vector3(),
      rot: new THREE.Vector3(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI),
      drift: 0.15 + rand() * 0.5,
      phase: rand() * Math.PI * 2,
      r: rand(),
    };
    piece.target.copy(piece.home);
    obj.position.copy(piece.home);
    obj.rotation.set(piece.rot.x, piece.rot.y, piece.rot.z);
    return piece;
  }

  /* Each mood is a placement rule, applied to the same pieces. */
  setMood(mood) {
    const n = this.pieces.length;
    this.pieces.forEach((p, i) => {
      const t = i / n;
      const a = t * Math.PI * 2;
      const spread = p.r;

      switch (mood) {
        case 'sketch': // loose grid, like frames pinned to a board
          p.target.set(
            (i % 5 - 2) * 3.4 + (spread - 0.5) * 1.2,
            (Math.floor(i / 5) % 5 - 2) * 3.0 + (spread - 0.5) * 1.0,
            -4 + spread * 8
          );
          break;
        case 'build': // stacked slabs, architectural
          p.target.set(
            (spread - 0.5) * 15,
            -7 + (i % 9) * 1.8,
            (spread - 0.5) * 13
          );
          break;
        case 'signal': // radiating from a centre
          p.target.set(
            Math.cos(a) * (4 + spread * 8),
            Math.sin(a) * (3.5 + spread * 7),
            Math.sin(a * 3) * 6
          );
          break;
        case 'machine': // helix, mechanical
          p.target.set(
            Math.cos(a * 3) * (4.5 + spread * 4),
            -9 + t * 18,
            Math.sin(a * 3) * (4.5 + spread * 4)
          );
          break;
        case 'panels': // tall vertical columns, like booth side panels
          p.target.set(
            (i % 6 - 2.5) * 3.1,
            (spread - 0.5) * 18,
            -6 + spread * 10
          );
          break;
        default: // bloom — the arrival cluster
          p.target.copy(p.home);
      }
    });
    this.mood = mood;
  }

  /* Where the cluster sits and how big it is, for the current viewport.
     On wide screens it holds the right third so the copy stays clear; on
     narrow screens there is nowhere to put it, so it shrinks and sits behind.
     The offset is a fraction of the world space actually visible at the
     camera's distance — a fixed world offset slides across the screen as the
     viewport aspect or camera distance changes. */
  layout() {
    const narrow = innerWidth < 900;
    const visibleH = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
    const visibleW = visibleH * this.camera.aspect;
    return { offsetX: narrow ? 0 : visibleW * 0.3, scale: narrow ? 0.5 : 0.86 };
  }

  // Jump straight to the current layout, with no ease-in. Used on first paint
  // and on resize, where easing would read as the scene sliding about.
  snapLayout() {
    const { offsetX, scale } = this.layout();
    this.group.position.x = offsetX;
    this.group.scale.setScalar(scale);
  }

  resize() {
    if (!this.ok) return;
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.snapLayout();
  }

  render(progress) {
    if (!this.ok) return;
    const time = this.clock.getElapsedTime();
    const ease = prefersReduced ? 1 : 0.035;

    this.pointer.lerp(this.pointerTarget, 0.05);

    for (const p of this.pieces) {
      p.obj.position.lerp(p.target, ease);
      if (!prefersReduced) {
        const sway = Math.sin(time * p.drift + p.phase) * (p.kind === 'sphere' ? 0.12 : 0.32);
        p.obj.position.y += sway * 0.02;
        p.obj.rotation.z += p.drift * 0.0012;
        if (p.kind === 'panel') p.obj.rotation.y += p.drift * 0.0008;
      }
    }

    const { offsetX, scale } = this.layout();
    this.group.position.x += (offsetX - this.group.position.x) * 0.04;
    this.group.scale.setScalar(this.group.scale.x + (scale - this.group.scale.x) * 0.06);
    this.group.rotation.y += (this.pointer.x * 0.16 - this.group.rotation.y) * 0.04;
    this.group.rotation.x += (this.pointer.y * 0.1 - this.group.rotation.x) * 0.04;

    // Stays close to the starting distance; the drift is a slow push-in
    // across the journey, not a jump away from where the scene was framed.
    const targetZ = 38 - progress * 4;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.04;

    this.renderer.render(this.scene, this.camera);
  }
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   SLOTS — manifest to DOM
   ============================================================ */

function makeSlot(item) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'slot';
  el.setAttribute('aria-label', `${item.kicker} — ${item.label}`);

  // Media on top, then a ruled-off block carrying the label — the same
  // two-part shape as the demo cards, so every box on the site reads alike.
  const media = document.createElement('span');
  media.className = 'slot-media';
  if (item.src && item.type === 'video') {
    const v = document.createElement('video');
    v.src = item.src;
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.setAttribute('muted', '');
    media.appendChild(v);
  } else if (item.src) {
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.label;
    img.loading = 'lazy';
    media.appendChild(img);
  } else {
    media.classList.add('is-empty');
  }

  const body = document.createElement('span');
  body.className = 'slot-body';
  body.innerHTML =
    `<span class="slot-kicker">${item.kicker}</span>` +
    `<span class="slot-label">${item.label}</span>`;

  el.append(media, body);
  el.addEventListener('click', () => openLightbox(item));
  return el;
}

function makeDemoButton(demo) {
  const el = document.createElement(demo.href ? 'a' : 'button');
  el.className = 'demo-btn';
  if (demo.href) {
    el.href = demo.href;
    el.target = '_blank';
    el.rel = 'noopener';
  } else {
    el.type = 'button';
    el.dataset.stub = 'true';
    el.addEventListener('click', () => openLightbox({
      kicker: demo.name,
      label: `${demo.name} demo — link pending`,
      src: null,
      type: 'image',
      note: 'Add the live URL to the ASSETS.demos entry in js/main.js and this button will open it directly.',
    }));
  }
  const media = document.createElement('span');
  media.className = 'demo-media';
  if (demo.poster && demo.posterType === 'video') {
    const v = document.createElement('video');
    v.src = demo.poster;
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.setAttribute('muted', '');
    media.appendChild(v);
  } else if (demo.poster) {
    const img = document.createElement('img');
    img.src = demo.poster;
    img.alt = `${demo.name} demo`;
    img.loading = 'lazy';
    media.appendChild(img);
  } else {
    media.classList.add('is-empty');
  }

  const body = document.createElement('span');
  body.className = 'demo-body';
  body.innerHTML =
    `<span class="demo-name">${demo.name}</span>` +
    `<span class="demo-desc">${demo.desc}</span>` +
    `<span class="demo-go">${demo.href ? 'Open demo →' : 'Link pending'}</span>`;

  el.append(media, body);
  return el;
}

function mountSlots() {
  document.querySelectorAll('[data-slots]').forEach((host) => {
    const key = host.dataset.slots;
    const items = ASSETS[key] || [];
    const frag = document.createDocumentFragment();
    items.forEach((item) => {
      frag.appendChild(key === 'demos' ? makeDemoButton(item) : makeSlot(item));
    });
    host.appendChild(frag);
  });
}

/* ============================================================
   LIGHTBOX
   ============================================================ */

const lightbox = document.getElementById('lightbox');
const lbMedia = document.getElementById('lb-media');
const lbTitle = document.getElementById('lb-title');
let lastFocus = null;

function openLightbox(item) {
  lastFocus = document.activeElement;
  lbMedia.textContent = '';

  if (item.src && item.type === 'video') {
    const v = document.createElement('video');
    v.src = item.src; v.controls = true; v.autoplay = true; v.loop = true; v.playsInline = true;
    lbMedia.appendChild(v);
  } else if (item.src) {
    const img = document.createElement('img');
    img.src = item.src; img.alt = item.label;
    lbMedia.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'lb-placeholder';
    ph.textContent = item.note || `${item.label} — media not added yet. Set the src for this slot in the ASSETS manifest.`;
    lbMedia.appendChild(ph);
  }

  lbTitle.textContent = `${item.kicker} · ${item.label}`;
  lightbox.hidden = false;
  document.body.classList.add('is-locked');
  requestAnimationFrame(() => lightbox.classList.add('is-open'));
  document.getElementById('lb-close').focus();
}

function closeLightbox() {
  lightbox.classList.remove('is-open');
  document.body.classList.remove('is-locked');
  setTimeout(() => {
    lightbox.hidden = true;
    lbMedia.textContent = '';
    if (lastFocus) lastFocus.focus();
  }, 320);
}

document.getElementById('lb-close').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

/* ============================================================
   NAVIGATION — scroll, rail, keys
   ============================================================ */

const sections = STAGES.map((s) => document.getElementById(s.id));
const rail = document.getElementById('rail');
const navWhere = document.getElementById('nav-where-name');
const progressFill = document.getElementById('nav-progress-fill');
const glow = document.getElementById('glow');
const scrollHint = document.getElementById('scroll-hint');

let current = -1;

function buildRail() {
  STAGES.forEach((stage, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span class="dot"></span><span class="label">${stage.name}</span>`;
    b.setAttribute('aria-label', `Go to ${stage.name}`);
    b.addEventListener('click', () => goTo(i));
    rail.appendChild(b);
  });
}

function stageScrollTop(i) {
  const max = document.documentElement.scrollHeight - innerHeight;
  return (i / (STAGES.length - 1)) * max;
}

/* Scrolling is animated by hand rather than with `behavior: 'smooth'`.
   Native smooth scroll is unreliable in embedded and headless contexts, and
   presenting needs the jump between stages to take a predictable amount of
   time regardless of where it is running. */
let scrollAnim = null;

function goTo(i, done) {
  const clamped = Math.max(0, Math.min(STAGES.length - 1, i));
  const to = stageScrollTop(clamped);
  const from = scrollY;
  const distance = to - from;

  if (scrollAnim) cancelAnimationFrame(scrollAnim);
  if (prefersReduced || Math.abs(distance) < 2) {
    scrollTo(0, to);
    if (done) done();
    return;
  }

  const duration = 620;
  const start = performance.now();

  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    // Quintic ease-out: takes hold immediately, then settles into place.
    const eased = 1 - Math.pow(1 - t, 5);
    scrollTo(0, from + distance * eased);
    if (t < 1) {
      scrollAnim = requestAnimationFrame(step);
    } else {
      scrollAnim = null;
      if (done) done();
    }
  };

  scrollAnim = requestAnimationFrame(step);
}

/* One gesture moves one stage.

   Left to the browser, a wheel or trackpad scrolls raw pixels through the
   scroll space, so crossing a stage takes a long grind of small steps. Here
   the gesture is swallowed and turned into a single snap: accumulate delta
   until it clears a threshold, jump one stage, then hold the lock until the
   gesture has actually stopped. Trackpad momentum arrives as a long tail of
   shrinking deltas, so the unlock timer restarts on every event and only
   fires once the tail goes quiet — otherwise one flick would skate through
   several stages. */
const WHEEL_THRESHOLD = 30;
const WHEEL_QUIET_MS = 140;

let wheelLock = false;
let wheelAccum = 0;
let wheelUnlockTimer = null;

function armWheelUnlock() {
  clearTimeout(wheelUnlockTimer);
  wheelUnlockTimer = setTimeout(() => {
    wheelLock = false;
    wheelAccum = 0;
  }, WHEEL_QUIET_MS);
}

addEventListener('wheel', (e) => {
  if (!lightbox.hidden) return; // the lightbox scrolls on its own
  e.preventDefault();

  if (wheelLock) { armWheelUnlock(); return; }

  wheelAccum += e.deltaY;
  if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return;

  const dir = Math.sign(wheelAccum);
  wheelAccum = 0;
  wheelLock = true;
  goTo(current + dir, armWheelUnlock);
}, { passive: false });

// Touch: one swipe, one stage.
const SWIPE_MIN = 40;
let touchStartY = null;

addEventListener('touchstart', (e) => {
  touchStartY = lightbox.hidden ? e.touches[0].clientY : null;
}, { passive: true });

addEventListener('touchmove', (e) => {
  if (touchStartY !== null) e.preventDefault();
}, { passive: false });

addEventListener('touchend', (e) => {
  if (touchStartY === null) return;
  const dy = e.changedTouches[0].clientY - touchStartY;
  touchStartY = null;
  if (Math.abs(dy) >= SWIPE_MIN) goTo(current + (dy < 0 ? 1 : -1));
});

function setStage(i) {
  if (i === current) return;
  current = i;
  const stage = STAGES[i];

  sections.forEach((el, n) => el.classList.toggle('is-active', n === i));
  [...rail.children].forEach((b, n) => b.setAttribute('aria-current', String(n === i)));

  const accent = ACCENTS[stage.accent];
  document.documentElement.style.setProperty('--accent', accent.hex);
  glow.style.setProperty('--glow-a', accent.glowA);
  glow.style.setProperty('--glow-b', accent.glowB);

  navWhere.textContent = stage.name;
  scrollHint.classList.toggle('is-hidden', i !== 0);
  scene.setMood(stage.mood);

  if (location.hash.slice(1) !== stage.id) {
    history.replaceState(null, '', `#${stage.id}`);
  }
}

function currentProgress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  return max > 0 ? scrollY / max : 0;
}

function onScroll() {
  const p = currentProgress();
  progressFill.style.width = `${p * 100}%`;
  setStage(Math.round(p * (STAGES.length - 1)));
}

addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);

addEventListener('keydown', (e) => {
  if (!lightbox.hidden) {
    if (e.key === 'Escape') closeLightbox();
    return;
  }
  const keysNext = ['ArrowRight', 'ArrowDown', 'PageDown', ' '];
  const keysPrev = ['ArrowLeft', 'ArrowUp', 'PageUp'];
  if (keysNext.includes(e.key)) { e.preventDefault(); goTo(current + 1); }
  else if (keysPrev.includes(e.key)) { e.preventDefault(); goTo(current - 1); }
  else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
  else if (e.key === 'End') { e.preventDefault(); goTo(STAGES.length - 1); }
});

document.getElementById('begin-btn').addEventListener('click', () => goTo(1));
document.querySelector('.nav-mark').addEventListener('click', (e) => { e.preventDefault(); goTo(0); });

/* ============================================================
   BOOT
   ============================================================ */

const scene = new Scene(document.getElementById('gl'));
window.__ce = { scene, goTo, STAGES }; // debug handle for tuning the scene
buildRail();
mountSlots();

const fromHash = STAGES.findIndex((s) => s.id === location.hash.slice(1));
if (fromHash > 0) {
  scrollTo({ top: stageScrollTop(fromHash), behavior: 'auto' });
}
onScroll();
setStage(Math.max(0, fromHash === -1 ? 0 : fromHash));

(function loop() {
  requestAnimationFrame(loop);
  scene.render(currentProgress());
})();
