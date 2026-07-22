(() => {
  const STORAGE_KEY = 'omchawatch.settings.v1';
  const DEFAULT_WALLPAPER = 'assets/mandala-bg.jpg';

  const DEFAULTS = {
    sphereColor: '#ffd76a',
    cvColor: '#4fd1c5',
    omcColors: ['#f7b733', '#ffe66d', '#ff6f61', '#8a63d2'],
    omcvColors: ['#7bd389', '#f4a259', '#6ec6ff', '#b892ff'],
    wallpaper: 'default',
    glowBoost: 1,
    timeScale: 1,
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULTS,
        ...parsed,
        omcColors: parsed.omcColors && parsed.omcColors.length === 4 ? parsed.omcColors : DEFAULTS.omcColors,
        omcvColors: parsed.omcvColors && parsed.omcvColors.length === 4 ? parsed.omcvColors : DEFAULTS.omcvColors,
      };
    } catch (e) {
      return { ...DEFAULTS };
    }
  }

  function saveSettings(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {
      console.warn('OmchaWatch: impossible de sauvegarder les réglages', e);
    }
  }

  const state = { settings: loadSettings(), bgImage: null, bgLayer: null };

  const canvas = document.getElementById('omcha-canvas');
  const ctx = canvas.getContext('2d');

  function rebuildBackgroundLayer() {
    if (!window.innerWidth || !window.innerHeight) return;
    state.bgLayer = OmchaRenderer.buildBackground(state.bgImage, window.innerWidth, window.innerHeight);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildBackgroundLayer();
  }
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });
  resize();

  function loadWallpaper(src) {
    const isDefault = src === DEFAULT_WALLPAPER;
    const img = new Image();
    img.onload = () => {
      if (isDefault) {
        // Recadrage serré sur la fleur centrale, avant les anneaux chiffrés
        // (mal placés) de l'image générée par IA.
        const half = img.width * 0.195;
        img.__omchaCrop = {
          sx: img.width * 0.5 - half,
          sy: img.height * 0.475 - half,
          sw: half * 2,
          sh: half * 2,
        };
      }
      state.bgImage = img;
      rebuildBackgroundLayer();
    };
    img.onerror = () => { state.bgImage = null; rebuildBackgroundLayer(); };
    img.src = src;
  }
  loadWallpaper(state.settings.wallpaper === 'default' ? DEFAULT_WALLPAPER : state.settings.wallpaper);

  // --- Boucle d'animation ---
  let simStart = null;
  let realStart = null;
  function loop() {
    const now = Date.now();
    if (simStart === null) { simStart = now; realStart = now; }
    const elapsedReal = now - realStart;
    const simMs = simStart + elapsedReal * state.settings.timeScale;
    const snap = OmchaTime.snapshot(simMs);
    OmchaRenderer.render(ctx, window.innerWidth, window.innerHeight, snap, state.settings, state.bgLayer);
    updateInfoPanel(snap);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // --- Panneau de réglages ---
  const panel = document.getElementById('settings-panel');
  const btnSettings = document.getElementById('btn-settings');
  const btnClose = document.getElementById('btn-close-settings');
  btnSettings.addEventListener('click', () => panel.classList.add('open'));
  btnClose.addEventListener('click', () => panel.classList.remove('open'));

  function bindColor(id, getter, setter) {
    const el = document.getElementById(id);
    el.value = getter();
    el.addEventListener('input', () => {
      setter(el.value);
      saveSettings(state.settings);
    });
  }
  bindColor('color-sphere', () => state.settings.sphereColor, (v) => { state.settings.sphereColor = v; });
  bindColor('color-cv', () => state.settings.cvColor, (v) => { state.settings.cvColor = v; });
  ['omc', 'omcv'].forEach((ring) => {
    for (let i = 0; i < 4; i++) {
      bindColor(`color-${ring}-${i}`,
        () => state.settings[`${ring}Colors`][i],
        (v) => { state.settings[`${ring}Colors`][i] = v; });
    }
  });

  const glowSlider = document.getElementById('glow-slider');
  glowSlider.value = state.settings.glowBoost;
  glowSlider.addEventListener('input', () => {
    state.settings.glowBoost = parseFloat(glowSlider.value);
    saveSettings(state.settings);
  });

  const wallpaperInput = document.getElementById('wallpaper-input');
  wallpaperInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const oc = document.createElement('canvas');
        oc.width = img.width * scale;
        oc.height = img.height * scale;
        oc.getContext('2d').drawImage(img, 0, 0, oc.width, oc.height);
        const dataUrl = oc.toDataURL('image/jpeg', 0.85);
        state.settings.wallpaper = dataUrl;
        saveSettings(state.settings);
        loadWallpaper(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('wallpaper-reset').addEventListener('click', () => {
    state.settings.wallpaper = 'default';
    saveSettings(state.settings);
    loadWallpaper(DEFAULT_WALLPAPER);
  });

  document.getElementById('btn-reset-colors').addEventListener('click', () => {
    state.settings = { ...state.settings, ...JSON.parse(JSON.stringify({
      sphereColor: DEFAULTS.sphereColor,
      cvColor: DEFAULTS.cvColor,
      omcColors: DEFAULTS.omcColors,
      omcvColors: DEFAULTS.omcvColors,
      glowBoost: DEFAULTS.glowBoost,
    })) };
    saveSettings(state.settings);
    location.reload();
  });

  // --- Panneau info (unités) ---
  const infoPanel = document.getElementById('info-panel');
  document.getElementById('btn-info').addEventListener('click', () => infoPanel.classList.toggle('open'));

  function updateInfoPanel(snap) {
    document.getElementById('info-pcv').textContent = snap.pcv.toFixed(1);
    document.getElementById('info-solondes').textContent = snap.solondes.toFixed(1);
    document.getElementById('info-cv').textContent = (snap.cv % OmchaTime.CV_PER_OMC).toFixed(2);
    document.getElementById('info-omc').textContent = snap.omc.toFixed(3);
    document.getElementById('info-omcv').textContent = snap.omcv.toFixed(4);
    document.getElementById('info-phase-omc').textContent = OmchaTime.PHASE_NAMES_OMC[snap.omcQuarter.q];
    document.getElementById('info-phase-omcv').textContent = OmchaTime.PHASE_LABELS_OMCV[snap.omcvQuarter.q];
  }
})();
