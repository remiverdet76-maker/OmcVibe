/*
 * OmchaRenderer — dessine le mandala-horloge sur un canvas plein écran.
 * Convention d'angle : 0°/360° en haut, sens horaire (comme une horloge).
 * Aucune aiguille : uniquement points-halo entourés d'un halo + traînée.
 */
const OmchaRenderer = (() => {
  const TAU = Math.PI * 2;
  const toRad = (deg) => (deg - 90) * (Math.PI / 180); // 0deg = haut

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

  function drawRingTrack(ctx, cx, cy, r, color, width, alpha) {
    ctx.save();
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // 4 arcs colorés (phases), avec un léger flou de transition entre eux.
  function drawPhaseArcs(ctx, cx, cy, r, colors, width) {
    ctx.save();
    ctx.lineWidth = width;
    ctx.lineCap = 'butt';
    for (let q = 0; q < 4; q++) {
      const a0 = toRad(q * 90);
      const a1 = toRad((q + 1) * 90);
      const grad = ctx.createLinearGradient(
        ...polar(cx, cy, r, q * 90),
        ...polar(cx, cy, r, (q + 1) * 90)
      );
      grad.addColorStop(0, rgba(colors[q], 0.85));
      grad.addColorStop(1, rgba(colors[(q + 1) % 4], 0.85));
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a1);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTicks(ctx, cx, cy, r, degs, color, len = 10, lw = 2) {
    ctx.save();
    ctx.strokeStyle = rgba(color, 0.9);
    ctx.lineWidth = lw;
    degs.forEach((d) => {
      const [x0, y0] = polar(cx, cy, r - len / 2, d);
      const [x1, y1] = polar(cx, cy, r + len / 2, d);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawLabel(ctx, cx, cy, r, deg, text, color, fontPx) {
    const [x, y] = polar(cx, cy, r, deg);
    ctx.save();
    ctx.font = `700 ${fontPx}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Halo sombre pour rester lisible quel que soit le fond.
    ctx.lineWidth = fontPx * 0.28;
    ctx.strokeStyle = 'rgba(4,2,10,0.85)';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = rgba(color, 0.98);
    ctx.shadowColor = rgba(color, 0.9);
    ctx.shadowBlur = fontPx * 0.5;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // Point-halo + traînée lumineuse le long de l'anneau, derrière le point.
  function drawHaloDot(ctx, cx, cy, r, deg, color, opts = {}) {
    const {
      dotRadius = 7,
      glow = 1,
      trailDeg = 40,
      trailWidth = 6,
    } = opts;
    ctx.save();
    // Traînée : dégradé le long de l'arc, s'estompant vers l'arrière.
    const steps = 28;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const d0 = deg - trailDeg * t0;
      const d1 = deg - trailDeg * t1;
      const alpha = (1 - t1) * 0.55 * glow;
      ctx.strokeStyle = rgba(color, alpha);
      ctx.lineWidth = trailWidth * (1 - t0 * 0.6);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, r, toRad(d0), toRad(d1));
      ctx.stroke();
    }
    // Halo
    const [x, y] = polar(cx, cy, r, deg);
    const haloR = dotRadius * (2.6 + 1.4 * glow);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    grad.addColorStop(0, rgba(color, 0.9 * glow));
    grad.addColorStop(0.4, rgba(color, 0.45 * glow));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, TAU);
    ctx.fill();
    // Point
    ctx.fillStyle = '#fff';
    ctx.shadowColor = rgba(color, 1);
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, TAU);
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

  function drawCenterText(ctx, cx, cy, mainText, subText, color) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = rgba(color, 1);
    ctx.shadowBlur = 18;
    ctx.font = "700 15px 'Segoe UI', system-ui, sans-serif";
    if (subText) ctx.fillText(subText, cx, cy - 16);
    ctx.restore();
  }

  // Construit une fois (au chargement/resize) un fond statique : dégradé
  // cosmique + étoiles générées + la fleur source, détourée et adoucie au
  // centre — sans jamais réutiliser les chiffres mal placés de l'image
  // d'origine, qui restent hors du disque central.
  function buildBackground(bgImage, w, h) {
    const oc = document.createElement('canvas');
    oc.width = w; oc.height = h;
    const c = oc.getContext('2d');
    const cx = w / 2, cy = h / 2;

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
      const coreR = Math.min(w, h) * 0.40;
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const t = tmp.getContext('2d');
      // Recadrage serré sur la fleur centrale de l'image source, en excluant
      // les anneaux chiffrés d'origine (mal placés) qui l'entourent.
      const crop = bgImage.__omchaCrop || { sx: 0, sy: 0, sw: bgImage.width, sh: bgImage.height };
      const d = coreR * 2;
      t.drawImage(bgImage, crop.sx, crop.sy, crop.sw, crop.sh, cx - d / 2, cy - d / 2, d, d);
      t.globalCompositeOperation = 'destination-in';
      const mg = t.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      mg.addColorStop(0, 'rgba(0,0,0,1)');
      mg.addColorStop(0.82, 'rgba(0,0,0,1)');
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

    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.46;

    const rSphere = R * 0.17;
    const rCV = R * 0.42;
    const rOmc = R * 0.68;
    const rOmcV = R * 0.93;
    const glowBoost = settings.glowBoost || 1;

    // --- Anneau OmcV (saisons, extérieur) ---
    drawPhaseArcs(ctx, cx, cy, rOmcV, settings.omcvColors, 10);
    drawTicks(ctx, cx, cy, rOmcV, [0, 90, 180, 270], '#ffffff', 14, 2);
    [0, 90, 180, 270].forEach((d) => {
      drawLabel(ctx, cx, cy, rOmcV + 26, d, String(d), '#ffffff', 15);
    });
    drawHaloDot(ctx, cx, cy, rOmcV, snap.omcvFrac * 360, settings.omcvColors[snap.omcvQuarter.q], {
      dotRadius: 6, glow: (0.6 + 0.4 * snap.omcvBreathe) * glowBoost, trailDeg: 55, trailWidth: 5,
    });

    // --- Anneau Omc (jour charmant, 12 chiffres) ---
    drawPhaseArcs(ctx, cx, cy, rOmc, settings.omcColors, 16);
    for (let i = 1; i <= 12; i++) {
      const val = i * 36; // 36..432
      const deg = (val / 432) * 360;
      const label = val === 432 ? '0' : String(val);
      drawLabel(ctx, cx, cy, rOmc, deg, label, '#fff8e6', 17);
    }
    drawHaloDot(ctx, cx, cy, rOmc, snap.omcFrac * 360, settings.omcColors[snap.omcQuarter.q], {
      dotRadius: 8, glow: (0.6 + 0.4 * snap.omcBreathe) * glowBoost, trailDeg: 45, trailWidth: 7,
    });

    // --- Anneau CV (respiration) ---
    drawRingTrack(ctx, cx, cy, rCV, settings.cvColor, 3, 0.5);
    drawTicks(ctx, cx, cy, rCV, [0, 90, 180, 270], settings.cvColor, 10, 2);
    drawHaloDot(ctx, cx, cy, rCV, snap.cvFrac * 360, settings.cvColor, {
      dotRadius: 6, glow: (0.5 + 0.5 * snap.cvBreathe) * glowBoost, trailDeg: 35, trailWidth: 5,
    });

    // --- Sphère centrale (PcV) ---
    drawSphere(ctx, cx, cy, rSphere, settings.sphereColor, snap.pcvBreathe, snap.flashFrac, settings.sphereColor);
    drawCenterText(ctx, cx, cy, '', snap.omc.toFixed(1), settings.sphereColor);
  }

  return { render, buildBackground };
})();
