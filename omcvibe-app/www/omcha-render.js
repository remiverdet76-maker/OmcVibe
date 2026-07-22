/*
 * OmchaRenderer — dessine le mandala-horloge sur un canvas plein écran.
 * Convention d'angle : 0°/360° en haut, sens horaire (comme une horloge).
 * Aucune aiguille : uniquement une comète-halo avec traînée lumineuse.
 */
const OmchaRenderer = (() => {
  const TAU = Math.PI * 2;
  const toRad = (deg) => (deg - 90) * (Math.PI / 180); // 0deg = haut
  const ELEGANT_FONT = "'Georgia', 'Times New Roman', serif";

  function polar(cx, cy, r, deg) {
    const a = toRad(deg);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255];
  }
  function rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }
  // Éclaircit une couleur hex vers le blanc (0=inchangé, 1=blanc pur).
  function lighten(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    const L = (v) => Math.round(v + (255 - v) * amt).toString(16).padStart(2, '0');
    return `#${L(r)}${L(g)}${L(b)}`;
  }

  function drawRingTrack(ctx, cx, cy, r, color, width, alpha) {
    ctx.save();
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // Halo arc-en-ciel doux autour de l'anneau : dégradé de teinte continu,
  // flouté, en dessous de la bande pleine — pure décoration lumineuse.
  function drawRainbowGlow(ctx, cx, cy, r, width, intensity) {
    if (intensity <= 0) return;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.shadowBlur = width * 0.9;
    const steps = 72;
    for (let i = 0; i < steps; i++) {
      const d0 = (i / steps) * 360;
      const d1 = ((i + 1) / steps) * 360;
      const hue = (i / steps) * 360;
      const col = `hsla(${hue},90%,60%,${0.5 * intensity})`;
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.arc(cx, cy, r, toRad(d0) - 0.02, toRad(d1) + 0.02);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Badge circulaire (chip) pour les repères majeurs, façon mockup.
  function drawBadge(ctx, cx, cy, r, deg, text, color) {
    const [x, y] = polar(cx, cy, r, deg);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, TAU);
    ctx.fillStyle = 'rgba(8,4,18,0.82)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = rgba(color, 0.95);
    ctx.shadowColor = rgba(color, 0.8);
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = `700 17px ${ELEGANT_FONT}`;
    ctx.fillStyle = rgba(color, 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawLabel(ctx, cx, cy, r, deg, text, color, fontPx) {
    const [x, y] = polar(cx, cy, r, deg);
    ctx.save();
    ctx.font = `700 ${fontPx}px ${ELEGANT_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Halo sombre pour rester lisible quel que soit le fond.
    ctx.lineWidth = fontPx * 0.24;
    ctx.strokeStyle = 'rgba(4,2,10,0.88)';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = fontPx * 0.55;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // Comète : traînée lumineuse depuis 0 jusqu'à la position courante, avec
  // une tête en halo façon "glow 3D" (cœur blanc chaud → couleur → transparent).
  function drawComet(ctx, cx, cy, r, deg, color, opts = {}) {
    const { headRadius = 8, glow = 1, trailWidth = 4 } = opts;
    ctx.save();
    const bright = lighten(color, 0.55);
    const span = ((deg % 360) + 360) % 360;
    const steps = Math.max(8, Math.round(span / 4));
    ctx.shadowColor = rgba(bright, 0.9);
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const d0 = span * t0;
      const d1 = span * t1;
      // s'estompe vers 0 (départ du cycle), s'intensifie vers la tête —
      // trait clair et brillant, distinct de la bande pleine en dessous.
      const alpha = Math.pow(t1, 1.4) * 0.85 * glow;
      ctx.strokeStyle = rgba(bright, alpha);
      ctx.lineWidth = trailWidth * (0.35 + 0.65 * t1);
      ctx.lineCap = 'round';
      ctx.shadowBlur = 6 * glow * t1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, toRad(d0), toRad(d1));
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // Halo 3D de la tête de comète.
    const [x, y] = polar(cx, cy, r, deg);
    const haloR = headRadius * (2.8 + 1.6 * glow);
    const grad = ctx.createRadialGradient(x - headRadius * 0.3, y - headRadius * 0.3, 0, x, y, haloR);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.28, rgba(color, 0.9 * glow));
    grad.addColorStop(0.65, rgba(color, 0.35 * glow));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, TAU);
    ctx.fill();
    // Cœur brillant façon sphère 3D.
    const coreGrad = ctx.createRadialGradient(x - headRadius * 0.35, y - headRadius * 0.35, 0, x, y, headRadius);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.55, rgba(color, 1));
    coreGrad.addColorStop(1, rgba(color, 0.5));
    ctx.fillStyle = coreGrad;
    ctx.shadowColor = rgba(color, 1);
    ctx.shadowBlur = 14 * glow;
    ctx.beginPath();
    ctx.arc(x, y, headRadius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawSphere(ctx, cx, cy, baseR, color, pulse, flashFrac, flashColor) {
    ctx.save();
    const r = baseR * (0.86 + 0.22 * pulse);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, rgba(color, 1));
    grad.addColorStop(1, rgba(color, 0.05));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();

    // Flash 360° toutes les 90 PcV : onde qui s'étend puis s'efface.
    if (flashFrac < 0.35) {
      const t = flashFrac / 0.35;
      const flashR = baseR * (1 + t * 5);
      ctx.strokeStyle = rgba(flashColor, (1 - t) * 0.55);
      ctx.lineWidth = 3 + 4 * (1 - t);
      ctx.beginPath();
      ctx.arc(cx, cy, flashR, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCenterText(ctx, cx, cy, subText, color) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = rgba(color, 1);
    ctx.shadowBlur = 18;
    ctx.font = `700 15px ${ELEGANT_FONT}`;
    if (subText) ctx.fillText(subText, cx, cy - 16);
    ctx.restore();
  }

  // Centre + échelle partagés par le fond et les anneaux : décalé vers le
  // bas pour laisser la place au titre "OmchaWatch" en haut d'écran.
  function centerFor(w, h) {
    return { cx: w / 2, cy: h * 0.55, R: Math.min(w, h) * 0.41 };
  }

  // Construit une fois (au chargement/resize) un fond statique : dégradé
  // cosmique + étoiles générées + le mandala source, détouré et recentré
  // EXACTEMENT sur sa propre sphère/anneaux dorés (mesurés une fois sur
  // l'image de référence), pour que nos anneaux fonctionnels coïncident
  // avec les cercles déjà visibles dans l'image.
  function buildBackground(bgImage, w, h) {
    const oc = document.createElement('canvas');
    oc.width = w; oc.height = h;
    const c = oc.getContext('2d');
    const { cx, cy, R } = centerFor(w, h);

    const g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.8);
    g.addColorStop(0, '#1a0e33');
    g.addColorStop(0.55, '#0a0518');
    g.addColorStop(1, '#020108');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);

    const starCount = Math.floor((w * h) / 3200);
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const rad = Math.random() * 1.6 + 0.2;
      const warm = Math.random() > 0.4;
      const alpha = Math.random() * 0.8 + 0.1;
      c.fillStyle = warm ? `rgba(255,${150 + Math.random() * 90 | 0},${60 + Math.random() * 60 | 0},${alpha})`
                          : `rgba(${200 + Math.random() * 55 | 0},${200 + Math.random() * 55 | 0},255,${alpha})`;
      c.beginPath();
      c.arc(x, y, rad, 0, TAU);
      c.fill();
    }

    if (bgImage) {
      const coreR = R;
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const t = tmp.getContext('2d');
      const crop = bgImage.__omchaCrop || { sx: 0, sy: 0, sw: bgImage.width, sh: bgImage.height };
      const d = coreR * 2;
      t.drawImage(bgImage, crop.sx, crop.sy, crop.sw, crop.sh, cx - d / 2, cy - d / 2, d, d);
      t.globalCompositeOperation = 'destination-in';
      const mg = t.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      mg.addColorStop(0, 'rgba(0,0,0,1)');
      mg.addColorStop(0.88, 'rgba(0,0,0,1)');
      mg.addColorStop(1, 'rgba(0,0,0,0)');
      t.fillStyle = mg;
      t.beginPath();
      t.arc(cx, cy, coreR, 0, TAU);
      t.fill();
      c.drawImage(tmp, 0, 0);
    }
    return oc;
  }

  function render(ctx, w, h, snap, settings, bgLayer) {
    ctx.clearRect(0, 0, w, h);

    if (bgLayer) {
      ctx.drawImage(bgLayer, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#050212';
      ctx.fillRect(0, 0, w, h);
    }

    const { cx, cy, R } = centerFor(w, h);

    // Rayons calés sur les cercles déjà visibles dans l'image de référence :
    // sphère ≈0.356R, respiration juste hors sphère, anneau OmcV sur le
    // double-cercle doré ≈0.71R, anneau Omc sur le grand cercle ≈0.93R.
    const rSphere = R * 0.356;
    const rCV = R * 0.42;
    const rOmcV = R * 0.71;
    const rOmc = R * 0.93;
    const glowBoost = settings.glowBoost ?? 1;
    const ringWidthMul = settings.ringWidth ?? 1;
    const cometSize = settings.cometSize ?? 1;
    const showNumbers = settings.showNumbers !== false;

    const wOmc = 26 * ringWidthMul;
    const wOmcV = 26 * ringWidthMul;
    const wCV = 18 * ringWidthMul;

    // --- Anneau Omc (432, extérieur, violet) ---
    drawRainbowGlow(ctx, cx, cy, rOmc, wOmc * 2.2, 0.65 * glowBoost);
    drawRingTrack(ctx, cx, cy, rOmc, settings.omcColor, wOmc, 0.95);
    if (showNumbers) {
      const omcLabelColor = lighten(settings.omcColor, 0.7);
      for (let i = 1; i <= 12; i++) {
        const val = i * 36; // 36..432
        const deg = (val / 432) * 360;
        const isBoundary = val % 108 === 0; // 108/216/324/432 : repères majeurs
        drawLabel(ctx, cx, cy, rOmc, deg, String(val), isBoundary ? '#ffffff' : omcLabelColor, isBoundary ? 23 : 14);
      }
      drawBadge(ctx, cx, cy, rOmc + wOmc + 18, 0, '432', settings.omcColor);
      drawBadge(ctx, cx, cy, rOmc + wOmc + 18, 180, '216', settings.omcColor);
    }
    drawComet(ctx, cx, cy, rOmc, snap.omcFrac * 360, settings.omcColor, {
      headRadius: 8 * cometSize, glow: (0.6 + 0.4 * snap.omcBreathe) * glowBoost, trailWidth: 5 * cometSize,
    });

    // --- Anneau OmcV (360, vert) ---
    drawRainbowGlow(ctx, cx, cy, rOmcV, wOmcV * 2.2, 0.65 * glowBoost);
    drawRingTrack(ctx, cx, cy, rOmcV, settings.omcvColor, wOmcV, 0.95);
    if (showNumbers) {
      const omcvLabelColor = lighten(settings.omcvColor, 0.7);
      [0, 90, 180, 270].forEach((d) => {
        drawLabel(ctx, cx, cy, rOmcV, d, String(d), omcvLabelColor, 19);
      });
    }
    drawComet(ctx, cx, cy, rOmcV, snap.omcvFrac * 360, settings.omcvColor, {
      headRadius: 7 * cometSize, glow: (0.6 + 0.4 * snap.omcvBreathe) * glowBoost, trailWidth: 4.5 * cometSize,
    });

    // --- Anneau CV (respiration, rouge, intérieur) ---
    drawRainbowGlow(ctx, cx, cy, rCV, wCV * 2.0, 0.55 * glowBoost);
    drawRingTrack(ctx, cx, cy, rCV, settings.cvColor, wCV, 0.95);
    drawComet(ctx, cx, cy, rCV, snap.cvFrac * 360, settings.cvColor, {
      headRadius: 6 * cometSize, glow: (0.5 + 0.5 * snap.cvBreathe) * glowBoost, trailWidth: 4 * cometSize,
    });

    // --- Sphère centrale (PcV) ---
    drawSphere(ctx, cx, cy, rSphere, settings.sphereColor, snap.pcvBreathe, snap.flashFrac, settings.sphereColor);
    drawCenterText(ctx, cx, cy, snap.omc.toFixed(1), settings.sphereColor);

    return { cx, cy, R };
  }

  return { render, buildBackground, centerFor };
})();
