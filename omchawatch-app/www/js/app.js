(function(){
"use strict";

var UNIT = 15552;
var CYCLE432 = 432;
var TROPICAL_YEAR_DAYS = 365.2425;
var EQUINOX_2026_MS = Date.UTC(2026,2,20,0,0,0);
var DAY_MS = 86400000;

var ARCHETYPES = ['Mobilité','Relation','Matière','Action','Expansion','Structure','Innovation','Sensibilité','Transformation'];
var SEASONS = ['Printemps','Été','Automne','Hiver'];

var defaults = {
  spherePulseSeconds: 2,
  colors: { cv:'#ffffff', omc:'#f5c842', omcv:'#7b58d4' },
  sizes: { cv:7, omc:11, omcv:14 },
  glow: { cv:0.6, omc:0.7, omcv:0.5 },
  showOmcV: true,
  reading: '432',
  birthdate: '1997-06-12',
  offsetDays: 288
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
  localStorage.setItem('omchawatch-settings', JSON.stringify(settings));
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

function pointAt(angleDeg, r){
  var a = (angleDeg-90) * Math.PI/180;
  return [500 + r*Math.cos(a), 500 + r*Math.sin(a)];
}

var svgns = 'http://www.w3.org/2000/svg';
function buildTicks(groupId, radius, count, majorEvery){
  var g = document.getElementById(groupId);
  g.innerHTML = '';
  for(var i=0;i<count;i++){
    var angle = i*(360/count);
    var isMajor = majorEvery && (i % majorEvery === 0);
    var len = isMajor ? 16 : 8;
    var p1 = pointAt(angle, radius-len);
    var p2 = pointAt(angle, radius);
    var line = document.createElementNS(svgns,'line');
    line.setAttribute('x1',p1[0]); line.setAttribute('y1',p1[1]);
    line.setAttribute('x2',p2[0]); line.setAttribute('y2',p2[1]);
    line.setAttribute('class','tick'+(isMajor?' major':''));
    g.appendChild(line);
  }
}

var RADIUS = { cv:195, omc:330, omcv:460 };

function buildOmcvMicroCircles(){
  var g = document.getElementById('omcv-ticks');
  g.innerHTML = '';
  for(var i=0;i<36;i++){
    var angle = i*10;
    var p = pointAt(angle, RADIUS.omcv);
    var c = document.createElementNS(svgns,'circle');
    c.setAttribute('cx',p[0]); c.setAttribute('cy',p[1]); c.setAttribute('r', i%9===0?5:3);
    c.setAttribute('class','tick'+(i%9===0?' major':''));
    c.setAttribute('fill', i%9===0 ? 'rgba(245,200,66,0.65)' : 'rgba(243,233,210,0.35)');
    g.appendChild(c);
  }
}

function applyRingStyle(prefix, color, size, glow){
  var comet = document.getElementById(prefix+'-comet');
  comet.setAttribute('fill', color);
  comet.style.color = color;
  comet.setAttribute('r', size);
  comet.style.filter = 'drop-shadow(0 0 '+(glow*16)+'px '+color+')';
}

var fluxLayer = document.getElementById('flux-layer');
function drawFlux(points, color, weight){
  fluxLayer.innerHTML = '';
  var t = Date.now()/1000;
  for(var i=0;i<points.length-1;i++){
    var a = points[i], b = points[i+1];
    var mx = (a[0]+b[0])/2, my=(a[1]+b[1])/2;
    var dx = b[0]-a[0], dy = b[1]-a[1];
    var norm = Math.sqrt(dx*dx+dy*dy) || 1;
    var nx = -dy/norm, ny = dx/norm;
    var bulge = 14 * (0.4+weight) * Math.sin(t*1.3 + i*1.7);
    var cx = mx + nx*bulge, cy = my + ny*bulge;
    var path = document.createElementNS(svgns,'path');
    path.setAttribute('d', 'M '+a[0]+' '+a[1]+' Q '+cx+' '+cy+' '+b[0]+' '+b[1]);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', 1 + weight*2.5);
    path.setAttribute('opacity', 0.2 + weight*0.35);
    fluxLayer.appendChild(path);
  }
}

var omcvRing = document.getElementById('ring-omcv');
var readoutEl = document.getElementById('omc-readout');
var sphereEl = document.getElementById('sphere');

function render(state){
  document.getElementById('cv-rotor').setAttribute('transform','rotate('+(state.cvPhase*360)+' 500 500)');
  document.getElementById('omc-rotor').setAttribute('transform','rotate('+(state.omcPhase*360)+' 500 500)');
  var omcvAngle = (state.dayInCycle/CYCLE432)*360;
  document.getElementById('omcv-rotor').setAttribute('transform','rotate('+omcvAngle+' 500 500)');

  readoutEl.textContent = state.omcValue36.toFixed(1);
  var col = lerpColor('#3ab8d8','#f5a742', state.densityWeight);
  readoutEl.style.fill = col;

  var pulseScale = 1 + 0.09*Math.sin(state.pulsePhase*2*Math.PI);
  sphereEl.setAttribute('r', 78*pulseScale);
  sphereEl.style.opacity = 0.85 + 0.15*Math.sin(state.pulsePhase*2*Math.PI);

  omcvRing.style.display = settings.showOmcV ? '' : 'none';

  var cvPt = pointAt(state.cvPhase*360, RADIUS.cv);
  var omcPt = pointAt(state.omcPhase*360, RADIUS.omc);
  var pts = [[500,500], cvPt, omcPt];
  if(settings.showOmcV){ pts.push(pointAt(omcvAngle, RADIUS.omcv)); }
  drawFlux(pts, col, state.densityWeight);

  updateReadingPanel(state);
}

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

function loop(){
  var state = computeEngineState(Date.now());
  render(state);
  requestAnimationFrame(loop);
}

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

  var ringMap = { cv:'cv', omc:'omc', omcv:'omcv' };
  Object.keys(ringMap).forEach(function(key){
    document.getElementById('col-'+key).addEventListener('input', function(e){ settings.colors[key]=e.target.value; saveSettings(); applyAllRingStyles(); });
    document.getElementById('size-'+key).addEventListener('input', function(e){ settings.sizes[key]=Number(e.target.value); saveSettings(); applyAllRingStyles(); });
    document.getElementById('glow-'+key).addEventListener('input', function(e){ settings.glow[key]=Number(e.target.value); saveSettings(); applyAllRingStyles(); });
  });

  document.getElementById('inp-birthdate').value = settings.birthdate;
  document.getElementById('inp-offset').value = settings.offsetDays;
  document.getElementById('inp-pulse').value = settings.spherePulseSeconds;
  document.getElementById('val-pulse').textContent = settings.spherePulseSeconds.toFixed(1)+'s';
  document.getElementById('chk-showomcv').checked = settings.showOmcV;
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

function applyAllRingStyles(){
  applyRingStyle('cv', settings.colors.cv, settings.sizes.cv, settings.glow.cv);
  applyRingStyle('omc', settings.colors.omc, settings.sizes.omc, settings.glow.omc);
  applyRingStyle('omcv', settings.colors.omcv, settings.sizes.omcv, settings.glow.omcv);
}

buildTicks('cv-ticks', RADIUS.cv, 36, 9);
buildTicks('omc-ticks', RADIUS.omc, 36, 9);
buildOmcvMicroCircles();
applyAllRingStyles();
initUI();
loop();

})();
