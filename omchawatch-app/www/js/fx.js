export function initFX(canvas){
  var ctx = canvas.getContext('2d');
  var glow = document.createElement('canvas');
  var gctx = glow.getContext('2d');

  var particles = [];
  var ripples = [];
  var lastAngles = {};

  function resize(){
    var rect = canvas.getBoundingClientRect();
    if(rect.width < 1) return;
    var dpr = Math.min(window.devicePixelRatio||1, 2);
    canvas.width = rect.width*dpr; canvas.height = rect.height*dpr;
    glow.width = canvas.width; glow.height = canvas.height;
    var s = (rect.width*dpr)/1000;
    ctx.setTransform(s,0,0,s,0,0);
    gctx.setTransform(s,0,0,s,0,0);
  }

  function pointAt(angleDeg, r, cx, cy){
    var a = (angleDeg-90)*Math.PI/180;
    return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
  }

  function hexToRgb(hex){
    hex = hex.replace('#','');
    return [parseInt(hex.substr(0,2),16), parseInt(hex.substr(2,2),16), parseInt(hex.substr(4,2),16)];
  }

  function spawnParticle(x,y,color,speed){
    particles.push({
      x:x, y:y,
      vx:(Math.random()-0.5)*8*speed, vy:(Math.random()-0.5)*8*speed,
      life:1, decay: 0.02+Math.random()*0.02,
      r: 2+Math.random()*3, color:color
    });
    if(particles.length>260) particles.splice(0, particles.length-260);
  }

  function spawnRipple(x,y,color){
    ripples.push({ x:x, y:y, r:4, maxR:46, life:1, color:color });
  }

  function checkMajorCrossing(key, angleDeg, x, y, color){
    var prev = lastAngles[key];
    lastAngles[key] = angleDeg;
    if(prev===undefined) return false;
    var prevSector = Math.floor(((prev%360)+360)%360 / 90);
    var curSector = Math.floor(((angleDeg%360)+360)%360 / 90);
    if(prevSector !== curSector){
      spawnRipple(x,y,color);
      return true;
    }
    return false;
  }

  function drawFlux(points, color, weight, t){
    for(var i=0;i<points.length-1;i++){
      var a = points[i], b = points[i+1];
      var segs = 5;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      for(var s=1;s<=segs;s++){
        var f = s/segs;
        var bx = a[0] + (b[0]-a[0])*f;
        var by = a[1] + (b[1]-a[1])*f;
        var dx = b[0]-a[0], dy = b[1]-a[1];
        var norm = Math.sqrt(dx*dx+dy*dy) || 1;
        var nx = -dy/norm, ny = dx/norm;
        var wobble = Math.sin(t*1.6 + i*2.1 + f*7.5) * 8 * (0.35+weight);
        ctx.lineTo(bx + nx*wobble, by + ny*wobble);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 + weight*2.4;
      ctx.globalAlpha = 0.16 + weight*0.3;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function render(state, comets){
    var t = performance.now()/1000;
    ctx.clearRect(0,0,1000,1000);
    gctx.clearRect(0,0,1000,1000);

    var pts = [[500,500]];
    comets.forEach(function(c){ pts.push([c.x,c.y]); });
    drawFlux(pts, state.fluxColor, state.densityWeight, t);

    var crossed = [];
    comets.forEach(function(c){
      if(Math.random() < 0.55){
        spawnParticle(c.x, c.y, c.color, 0.5+state.densityWeight);
      }
      if(checkMajorCrossing(c.key, c.angle, c.x, c.y, c.color)) crossed.push(c.key);
    });

    for(var i=particles.length-1;i>=0;i--){
      var p = particles[i];
      p.x += p.vx*0.14; p.y += p.vy*0.14;
      p.life -= p.decay;
      if(p.life<=0){ particles.splice(i,1); continue; }
      gctx.beginPath();
      gctx.fillStyle = p.color;
      gctx.globalAlpha = p.life*0.8;
      gctx.arc(p.x, p.y, p.r*p.life, 0, Math.PI*2);
      gctx.fill();
    }
    gctx.globalAlpha = 1;

    for(var j=ripples.length-1;j>=0;j--){
      var r = ripples[j];
      r.r += (r.maxR-r.r)*0.12;
      r.life -= 0.035;
      if(r.life<=0){ ripples.splice(j,1); continue; }
      gctx.beginPath();
      gctx.strokeStyle = r.color;
      gctx.globalAlpha = r.life*0.55;
      gctx.lineWidth = 2.5;
      gctx.arc(r.x, r.y, r.r, 0, Math.PI*2);
      gctx.stroke();
    }
    gctx.globalAlpha = 1;

    comets.forEach(function(c){
      gctx.beginPath();
      gctx.fillStyle = c.color;
      gctx.arc(c.x, c.y, c.r*1.4, 0, Math.PI*2);
      gctx.fill();
    });

    ctx.save();
    ctx.filter = 'blur(6px)';
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.9;
    ctx.drawImage(glow, 0, 0, canvas.width, canvas.height, 0, 0, 1000, 1000);
    ctx.restore();

    ctx.save();
    ctx.filter = 'blur(10px)';
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.35;
    ctx.translate(2.5, 0);
    ctx.drawImage(glow, 0, 0, canvas.width, canvas.height, 0, 0, 1000, 1000);
    ctx.translate(-5, 0);
    ctx.drawImage(glow, 0, 0, canvas.width, canvas.height, 0, 0, 1000, 1000);
    ctx.restore();

    ctx.drawImage(glow, 0, 0, canvas.width, canvas.height, 0, 0, 1000, 1000);

    return crossed;
  }

  window.addEventListener('resize', resize);
  resize();

  return { render: render, resize: resize, pointAt: pointAt, hexToRgb: hexToRgb };
}
