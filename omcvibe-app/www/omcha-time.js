/*
 * OmchaTime — moteur de temps fractal, indépendant de 24/60/60/365.
 * Unités : Solonde < PcV (PatchaVibe) < CV (ChaVibe) < Omc (Omcha) < OmcV.
 * Époque de référence : époque Unix (1970-01-01T00:00:00Z), pour un calcul
 * simple et identique sur tous les appareils.
 */
const OmchaTime = (() => {
  // Les 4 ratios fractals, présents à toutes les échelles (micro-battement,
  // respiration, jour charmant, saisons). Leur somme ≈ 4,0424 ≈ 4,04 Solondes/PcV.
  const RATIOS = [11 / 10, 6 / 5, 10 / 11, 5 / 6];
  const RATIO_SUM = RATIOS.reduce((a, b) => a + b, 0);
  const SOLONDES_PER_PCV = RATIO_SUM; // ≈ 4.04

  const PCV_PER_CV = 360;
  const CV_PER_OMC = 432;
  const OMC_PER_OMCV = 360;
  const PCV_PER_OMC = PCV_PER_CV * CV_PER_OMC; // 155 520 — "journée charmante"

  const PHASE_NAMES_OMC = [
    'Expansion douce',
    'Expansion charmante',
    'Contraction douce',
    'Contraction charmante',
  ];
  const PHASE_LABELS_OMC = [
    'Polarité solaire → Lever',
    'Lever → Zénith',
    'Zénith → Coucher',
    'Coucher → Polarité solaire',
  ];
  const PHASE_LABELS_OMCV = [
    'Équinoxe → Solstice été',
    'Solstice été → Équinoxe',
    'Équinoxe → Solstice hiver',
    'Solstice hiver → Équinoxe',
  ];

  function frac(x) {
    return x - Math.floor(x);
  }

  // Découpe une fraction de cycle [0,1) en quart (0..3), position locale dans
  // ce quart (0..1) et le ratio fractal associé à ce quart.
  function quarterOf(cycleFrac) {
    const f = frac(cycleFrac);
    const q = Math.min(3, Math.floor(f * 4));
    const local = f * 4 - q;
    return { q, local, ratio: RATIOS[q] };
  }

  // Intensité de "respiration" 0..1..0 à l'intérieur d'un quart, déformée par
  // le ratio local. Ne modifie JAMAIS la position affichée (toujours neutre/
  // linéaire) — uniquement l'animation (halo, traînée, pulsation).
  function breathe(cycleFrac) {
    const { local, ratio } = quarterOf(cycleFrac);
    const warped = Math.pow(Math.min(1, Math.max(0, local)), 1 / ratio);
    return 0.5 - 0.5 * Math.cos(Math.PI * warped);
  }

  // Glissement interne fractal : applique récursivement quarterOf() sur la
  // fraction locale d'un niveau pour obtenir les sous-cycles imbriqués
  // (auto-similarité à chaque échelle).
  function nestedPhase(cycleFrac, depth = 2) {
    const levels = [];
    let f = frac(cycleFrac);
    for (let i = 0; i < depth; i++) {
      const { q, local, ratio } = quarterOf(f);
      levels.push({ q, ratio, local });
      f = local;
    }
    return levels;
  }

  function snapshot(tsMs = Date.now()) {
    const pcv = tsMs / 1000; // 1 PcV ≈ 1 seconde
    const solondes = pcv * SOLONDES_PER_PCV;
    const cv = pcv / PCV_PER_CV;
    const omc = cv / CV_PER_OMC;
    const omcv = omc / OMC_PER_OMCV;

    const pcvFrac = frac(pcv); // micro-battement (4 phases / seconde)
    const flashFrac = frac(pcv / 90); // flash 360° toutes les 90 PcV
    const cvFrac = frac(cv); // position sur l'anneau CV (respiration)
    const omcFrac = frac(omc); // position sur l'anneau Omc (jour charmant)
    const omcvFrac = frac(omcv); // position sur l'anneau OmcV (saisons)

    return {
      pcv, solondes, cv, omc, omcv,
      pcvFrac, flashFrac, cvFrac, omcFrac, omcvFrac,
      pcvBreathe: breathe(pcvFrac),
      cvBreathe: breathe(cvFrac),
      omcBreathe: breathe(omcFrac),
      omcvBreathe: breathe(omcvFrac),
      omcQuarter: quarterOf(omcFrac),
      omcvQuarter: quarterOf(omcvFrac),
      omcvNested: nestedPhase(omcvFrac, 2),
    };
  }

  return {
    RATIOS, RATIO_SUM, SOLONDES_PER_PCV,
    PCV_PER_CV, CV_PER_OMC, OMC_PER_OMCV, PCV_PER_OMC,
    PHASE_NAMES_OMC, PHASE_LABELS_OMC, PHASE_LABELS_OMCV,
    frac, quarterOf, breathe, nestedPhase, snapshot,
  };
})();
