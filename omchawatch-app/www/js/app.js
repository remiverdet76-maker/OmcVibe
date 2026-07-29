import { initSphere3D } from './sphere3d.js';
import { initFX } from './fx.js';
import { initBG } from './bg.js';

var UNIT = 15552;
var CYCLE432 = 432;
var TROPICAL_YEAR_DAYS = 365.2425;
var EQUINOX_2026_MS = Date.UTC(2026,2,20,0,0,0);
var DAY_MS = 86400000;
var RADIUS = { cv:195, omc:330, omcv:460 };

var ARCHETYPES = ['Mobilité','Relation','Matière','Action','Expansion','Structure','Innovation','Sensibilité','Transformation'];
var SEASONS = ['Printemps','Été','Automne','Hiver'];

var defaults = {
  spherePulseSeconds: 2,
  colors: { cv:'#ffffff', omc:'#f5c842', omcv:'#7b58d4' },
  sizes: { cv:7, omc:11, omcv:14 },
  glow: { cv:0.6, omc:0.7, omcv:0.5 },
  showOmcV: true,
  haptics: true,
  reading: '432',
  birthdate: '1997-06-12',
  offsetDays: 288,
  wallpaperPreset: 'mandala2'
};

var settings = loadSettings();

function loadSettings(){
  try{
    var raw = localStorage.getItem('omchawatch-settings');
    if(!raw) return JSON.parse(JSON.stringify(defaults));
    var s = JSON.parse(raw);
    return Object.assign(JSON.parse(JSON.stringify(defaults)), s);
  }catch(e){ return JSON.parse(JSON.stringify(defaults)); }
}
function saveSettings(){
  try{ localStorage.setItem('omchawatch-settings', JSON.stringify(settings)); }catch(e){}
}

function mod(n,m){ return ((n % m) + m) % m; }

function personalJ0Ms(){
  var t = Date.parse(settings.birthdate + 'T00:00:00Z');
  if(isNaN(t)) t = Date.parse(defaults.birthdate + 'T00:00:00Z');
  return t - (Number(settings.offsetDays)||0) * DAY_MS;
}

function computeEngineState(nowMs){
  var solondesPerSecond = (UNIT*4) / settings.spherePulseSeconds;
  var solondes = (nowMs/1000) * solondesPerSecond;

  var cvCycles = solondes / UNIT;
  var cvPhase = mod(cvCycles,1);

  var omcCycles = solondes / (UNIT*UNIT);
  var omcPhase = mod(omcCycles,1);
  var omcValue36 = mod(omcCycles*36,36);

  var pulsePhase = mod(cvCycles/4, 1);

  var daysSinceJ0 = (nowMs - personalJ0Ms()) / DAY_MS;
  var dayInCycle = mod(daysSinceJ0, CYCLE432);
  var phaseIndex = Math.floor(dayInCycle/36) + 1;
  var archIndex = Math.floor(mod(dayInCycle,9));
  var cycleIndex = Math.floor(daysSinceJ0/CYCLE432) + 1;

  var daysSinceEquinox = (nowMs - EQUINOX_2026_MS) / DAY_MS;
  var yearPhase = mod(daysSinceEquinox, TROPICAL_YEAR_DAYS) / TROPICAL_YEAR_DAYS;
  var solarDay = Math.floor(yearPhase*360)+1;
  var seasonIndex = Math.floor(yearPhase*4);
  var wave = 396 + 36*Math.cos(2*Math.PI*yearPhase);
  var densityWeight = (wave-360)/72;

  return {
    solondes: solondes, cvPhase: cvPhase, omcPhase: omcPhase, omcValue36: omcValue36,
    pulsePhase: pulsePhase, dayInCycle: dayInCycle, phaseIndex: phaseIndex, archIndex: archIndex,
    cycleIndex: cycleIndex, solarDay: solarDay, seasonIndex: seasonIndex, wave: wave, densityWeight: densityWeight
  };
}

function lerpColor(a,b,t){
  function hex(c){ c=c.replace('#',''); return [parseInt(c.substr(0,2),16),parseInt(c.substr(2,2),16),parseInt(c.substr(4,2),16)]; }
  var ca=hex(a), cb=hex(b);
  var r=Math.round(ca[0]+(cb[0]-ca[0])*t), g=Math.round(ca[1]+(cb[1]-ca[1])*t), bl=Math.round(ca[2]+(cb[2]-ca[2])*t);
  return 'rgb('+r+','+g+','+bl+')';
}
function hex2(a,b,t){
  var c = lerpColor(a,b,t).match(/\d+/g).map(Number);
  return '#'+c.map(function(v){return v.toString(16).padStart(2,'0');}).join('');
}

function pointAt(angleDeg, r){
  var a = (angleDeg-90) * Math.PI/180;
  return [500 + r*Math.cos(a), 500 + r*Math.sin(a)];
}

var readoutEl = document.getElementById('omc-readout');
var lastReadoutText = '';
function renderRollingNumber(text){
  if(text === lastReadoutText) return;
  var prev = lastReadoutText;
  lastReadoutText = text;
  readoutEl.innerHTML = '';
  for(var i=0;i<text.length;i++){
    var span = document.createElement('span');
    span.className = 'digit';
    span.textContent = text[i];
    if(prev[i] !== text[i]){
      span.style.animation = 'none';
      span.getBoundingClientRect();
      span.style.animation = 'digitRoll 0.35s ease';
    }
    readoutEl.appendChild(span);
  }
}

var styleTag = document.createElement('style');
styleTag.textContent = '@keyframes digitRoll{0%{transform:translateY(-0.4em);opacity:0}100%{transform:translateY(0);opacity:1}} #omc-readout .digit{display:inline-block}';
document.head.appendChild(styleTag);

var sphereCanvas = document.getElementById('sphere-canvas');
var fxCanvas = document.getElementById('fx-canvas');
var bgCanvas = document.getElementById('bg-canvas');
var sphere3d = initSphere3D(sphereCanvas);
var fx = initFX(fxCanvas);
var bg = initBG(bgCanvas);

var lastComets = {};

function updateReadingPanel(state){
  var el = document.getElementById('reading-readout');
  if(!el) return;
  if(settings.reading === '432'){
    el.innerHTML = 'Jour <b>'+(Math.floor(state.dayInCycle)+1)+'</b> / 432 · Cycle <b>'+state.cycleIndex+'</b><br/>'+
      'Phase <b>'+state.phaseIndex+'</b>/12 · Archétype <b>'+ARCHETYPES[state.archIndex]+'</b>';
  } else {
    el.innerHTML = 'Jour solaire <b>'+state.solarDay+'</b> / 360 · <b>'+SEASONS[state.seasonIndex]+'</b><br/>'+
      'Densité de l\'onde (360↔432, centre 396) : <b>'+state.wave.toFixed(1)+'</b>';
  }
}

function updateJ0Panel(){
  var el = document.getElementById('j0-readout');
  if(!el) return;
  var j0 = new Date(personalJ0Ms());
  var days = Math.floor((Date.now()-personalJ0Ms())/DAY_MS);
  el.innerHTML = 'J0 = <b>'+j0.toISOString().slice(0,10)+'</b><br/>'+days+' jours écoulés depuis J0';
}

var SHIMMER_SPEED = { cv:54, omc:19, omcv:6 };

function render(state){
  var cvAngle = state.cvPhase*360;
  var omcAngle = state.omcPhase*360;
  var omcvAngle = (state.dayInCycle/CYCLE432)*360;

  renderRollingNumber(state.omcValue36.toFixed(1));
  var col = hex2('#3ab8d8','#f5a742', state.densityWeight);
  readoutEl.style.color = col;
  readoutEl.style.textShadow = '0 0 '+(14+state.densityWeight*14)+'px '+col+'aa, 0 0 4px rgba(58,36,8,0.4)';

  var cv = { key:'cv', radius:RADIUS.cv, angle:cvAngle, color: settings.colors.cv, cometR: settings.sizes.cv, shimmerSpeed: SHIMMER_SPEED.cv };
  var omc = { key:'omc', radius:RADIUS.omc, angle:omcAngle, color: settings.colors.omc, cometR: settings.sizes.omc, shimmerSpeed: SHIMMER_SPEED.omc, miniOf: cv };
  var rings = [cv, omc];
  if(settings.showOmcV){
    var omcv = { key:'omcv', radius:RADIUS.omcv, angle:omcvAngle, color: settings.colors.omcv, cometR: settings.sizes.omcv, shimmerSpeed: SHIMMER_SPEED.omcv, miniOf: omc };
    rings.push(omcv);
  }

  lastComets = {};
  rings.forEach(function(r){
    var p = pointAt(r.angle, r.radius);
    lastComets[r.key] = { x:p[0], y:p[1] };
  });

  state.fluxColor = col;
  bg.render(state);
  sphere3d.update(state);
  var crossed = fx.render(state, rings);
  if(settings.haptics && crossed && crossed.length && navigator.vibrate){
    navigator.vibrate(14);
  }

  updateReadingPanel(state);
}

function loop(){
  var state = computeEngineState(Date.now());
  render(state);
  requestAnimationFrame(loop);
}

function applyWallpaper(src){
  bg.setWallpaper(src);
}

function selectPreset(id){
  settings.wallpaperPreset = id;
  settings.wallpaperCustom = null;
  saveSettings();
  try{ localStorage.removeItem('omchawatch-wallpaper'); }catch(e){}
  refreshWallpaperUI();
  if(id === 'none'){ applyWallpaper(''); }
  else if(id === 'mandala1'){ applyWallpaper('img/omcha-mandala.png'); }
  else { applyWallpaper('img/omcha-mandala-2.png'); }
}

function refreshWallpaperUI(){
  document.querySelectorAll('.wp-thumb').forEach(function(btn){
    btn.classList.toggle('active', btn.dataset.wp === settings.wallpaperPreset && !settings.wallpaperCustom);
  });
}

function importWallpaperFile(file){
  var reader = new FileReader();
  reader.onload = function(e){
    var img = new Image();
    img.onload = function(){
      var size = 1000;
      var canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      var ctx = canvas.getContext('2d');
      var side = Math.min(img.width, img.height);
      var sx = (img.width-side)/2, sy = (img.height-side)/2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      try{
        localStorage.setItem('omchawatch-wallpaper', dataUrl);
        settings.wallpaperCustom = true;
        saveSettings();
      }catch(err){ settings.wallpaperCustom = true; }
      applyWallpaper(dataUrl);
      refreshWallpaperUI();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function initWallpaper(){
  var custom = null;
  try{ custom = localStorage.getItem('omchawatch-wallpaper'); }catch(e){}
  if(custom && settings.wallpaperCustom){
    applyWallpaper(custom);
  } else {
    selectPreset(settings.wallpaperPreset || 'mandala2');
  }
  refreshWallpaperUI();

  document.querySelectorAll('.wp-thumb').forEach(function(btn){
    btn.addEventListener('click', function(){ selectPreset(btn.dataset.wp); });
  });
  document.getElementById('inp-wallpaper-file').addEventListener('change', function(e){
    if(e.target.files && e.target.files[0]) importWallpaperFile(e.target.files[0]);
  });
}

var scene = document.getElementById('scene');
var zoomScale = 1;
(function initGestures(){
  var pinchStartDist = null, pinchStartScale = 1;
  function dist(t0,t1){ return Math.hypot(t1.clientX-t0.clientX, t1.clientY-t0.clientY); }
  scene.addEventListener('touchstart', function(e){
    if(e.touches.length === 2){
      pinchStartDist = dist(e.touches[0], e.touches[1]);
      pinchStartScale = zoomScale;
    }
  }, { passive:true });
  scene.addEventListener('touchmove', function(e){
    if(e.touches.length === 2 && pinchStartDist){
      var d = dist(e.touches[0], e.touches[1]);
      zoomScale = Math.min(2.2, Math.max(0.8, pinchStartScale * (d/pinchStartDist)));
      scene.style.transform = 'rotateX(7deg) scale('+zoomScale+')';
    }
  }, { passive:true });
  scene.addEventListener('touchend', function(e){
    if(e.touches.length < 2) pinchStartDist = null;
  }, { passive:true });

  var popup = document.getElementById('comet-popup');
  var popupTimer = null;
  function handleTap(clientX, clientY){
    var rect = scene.getBoundingClientRect();
    var ux = (clientX-rect.left)/rect.width*1000;
    var uy = (clientY-rect.top)/rect.height*1000;
    var best = null, bestDist = 34;
    Object.keys(lastComets).forEach(function(k){
      var c = lastComets[k];
      var d = Math.hypot(c.x-ux, c.y-uy);
      if(d < bestDist){ bestDist = d; best = k; }
    });
    if(!best) return;
    var label = { cv:'Cv — Chavibe (comète neutre la plus rapide)', omc:'Omc — Omcha (unité affichée au centre)', omcv:'OmcV — anneau humain / terrestre' }[best];
    popup.textContent = label;
    popup.classList.add('show');
    clearTimeout(popupTimer);
    popupTimer = setTimeout(function(){ popup.classList.remove('show'); }, 2600);
  }
  scene.addEventListener('click', function(e){ handleTap(e.clientX, e.clientY); });
})();

function initUI(){
  document.getElementById('btn-settings').addEventListener('click', function(){
    document.getElementById('settings-panel').classList.remove('hidden');
  });
  document.getElementById('btn-close').addEventListener('click', function(){
    document.getElementById('settings-panel').classList.add('hidden');
  });

  var ptabs = document.querySelectorAll('.ptab');
  ptabs.forEach(function(btn){
    btn.addEventListener('click', function(){
      ptabs.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.ptab-panel').forEach(function(p){ p.classList.remove('active'); });
      document.querySelector('.ptab-panel[data-panel="'+btn.dataset.tab+'"]').classList.add('active');
    });
  });

  var segBtns = document.querySelectorAll('.seg-btn');
  segBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      segBtns.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      settings.reading = btn.dataset.reading;
      saveSettings();
    });
  });

  document.getElementById('chk-showomcv').addEventListener('change', function(e){
    settings.showOmcV = e.target.checked;
    saveSettings();
  });
  document.getElementById('chk-haptics').addEventListener('change', function(e){
    settings.haptics = e.target.checked;
    saveSettings();
  });

  document.getElementById('inp-birthdate').addEventListener('change', function(e){
    settings.birthdate = e.target.value; saveSettings(); updateJ0Panel();
  });
  document.getElementById('inp-offset').addEventListener('input', function(e){
    settings.offsetDays = Number(e.target.value); saveSettings(); updateJ0Panel();
  });

  document.getElementById('inp-pulse').addEventListener('input', function(e){
    settings.spherePulseSeconds = Number(e.target.value);
    document.getElementById('val-pulse').textContent = settings.spherePulseSeconds.toFixed(1)+'s';
    saveSettings();
  });

  var ringMap = ['cv','omc','omcv'];
  ringMap.forEach(function(key){
    document.getElementById('col-'+key).addEventListener('input', function(e){ settings.colors[key]=e.target.value; saveSettings(); });
    document.getElementById('size-'+key).addEventListener('input', function(e){ settings.sizes[key]=Number(e.target.value); saveSettings(); });
    document.getElementById('glow-'+key).addEventListener('input', function(e){ settings.glow[key]=Number(e.target.value); saveSettings(); });
  });

  document.getElementById('inp-birthdate').value = settings.birthdate;
  document.getElementById('inp-offset').value = settings.offsetDays;
  document.getElementById('inp-pulse').value = settings.spherePulseSeconds;
  document.getElementById('val-pulse').textContent = settings.spherePulseSeconds.toFixed(1)+'s';
  document.getElementById('chk-showomcv').checked = settings.showOmcV;
  document.getElementById('chk-haptics').checked = settings.haptics;
  document.getElementById('col-cv').value = settings.colors.cv;
  document.getElementById('col-omc').value = settings.colors.omc;
  document.getElementById('col-omcv').value = settings.colors.omcv;
  document.getElementById('size-cv').value = settings.sizes.cv;
  document.getElementById('size-omc').value = settings.sizes.omc;
  document.getElementById('size-omcv').value = settings.sizes.omcv;
  document.getElementById('glow-cv').value = settings.glow.cv;
  document.getElementById('glow-omc').value = settings.glow.omc;
  document.getElementById('glow-omcv').value = settings.glow.omcv;
  segBtns.forEach(function(b){ b.classList.toggle('active', b.dataset.reading===settings.reading); });

  setInterval(updateJ0Panel, 1000);
  updateJ0Panel();
}

initWallpaper();
initUI();
loop();
