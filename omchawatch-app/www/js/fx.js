function hexToHsl(hex){
  hex = hex.replace('#','');
  var r = parseInt(hex.substr(0,2),16)/255, g = parseInt(hex.substr(2,2),16)/255, b = parseInt(hex.substr(4,2),16)/255;
  var max = Math.max(r,g,b), min = Math.min(r,g,b);
  var h, s, l = (max+min)/2;
  if(max===min){ h=0; s=0; }
  else{
    var d = max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d+(g<b?6:0); break;
      case g: h=(b-r)/d+2; break;
      default: h=(r-g)/d+4;
    }
    h *= 60;
  }
  return [h, s*100, l*100];
}

export function initFX(canvas){
  var ctx = canvas.getContext('2d');
  var glow = document.createElement('canvas');
  var gctx = glow.getContext('2d');

  var particles = [];
  var ripples = [];
  var lastCometAngles = {};

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

  function drawBraidRing(targetCtx, opts){
    var count = opts.count, majorEvery = opts.majorEvery || 0;
    var spacing = 360/count;
    var circR = opts.radius * (opts.circRatio || 0.118);
    var shimmer = (opts.time * opts.shimmerSpeed) % 360;
    var spread = opts.hueSpread===undefined ? 300 : opts.hueSpread;
    for(var pass=0; pass<2; pass++){
      for(var i=pass; i<count; i+=2){
        var baseAngle = i*spacing;
        var pos = pointAt(baseAngle, opts.radius, opts.cx, opts.cy);
        var isMajor = majorEvery && (i % majorEvery === 0);
        var hue = ((opts.hueAnchor + (i/count)*spread - spread/2 + shimmer) % 360 + 360) % 360;
        var r = isMajor ? circR*1.3 : circR;
        var alpha = (isMajor ? 0.72 : 0.5) * (opts.alphaScale||1);
        targetCtx.beginPath();
        targetCtx.fillStyle = 'hsla('+hue+',82%,60%,'+alpha+')';
        targetCtx.arc(pos[0], pos[1], r, 0, Math.PI*2);
        targetCtx.fill();
      }
    }
    targetCtx.beginPath();
    targetCtx.strokeStyle = 'rgba(245,200,66,'+(0.3*(opts.alphaScale||1))+')';
    targetCtx.lineWidth = 1.2;
    targetCtx.arc(opts.cx, opts.cy, opts.radius, 0, Math.PI*2);
    targetCtx.stroke();

    var cpos = pointAt(opts.cometAngle, opts.radius, opts.cx, opts.cy);
    return cpos;
  }

  function drawGlow(targetCtx, pos, color, r, alphaScale){
    var grad = targetCtx.createRadialGradient(pos[0],pos[1],0,pos[0],pos[1], r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'transparent');
    targetCtx.fillStyle = grad;
    targetCtx.globalAlpha = alphaScale===undefined?1:alphaScale;
    targetCtx.beginPath(); targetCtx.arc(pos[0],pos[1], r, 0, Math.PI*2); targetCtx.fill();
    targetCtx.globalAlpha = 1;
  }

  function drawCometGlow(targetCtx, pos, color, r, alphaScale){
    var grad = targetCtx.createRadialGradient(pos[0],pos[1],0,pos[0],pos[1], r*3.4);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'transparent');
    targetCtx.fillStyle = grad;
    targetCtx.globalAlpha = alphaScale===undefined?1:alphaScale;
    targetCtx.beginPath(); targetCtx.arc(pos[0],pos[1], r*3.4, 0, Math.PI*2); targetCtx.fill();
    targetCtx.globalAlpha = 1;
    targetCtx.beginPath();
    targetCtx.fillStyle = color;
    targetCtx.arc(pos[0],pos[1], r, 0, Math.PI*2);
    targetCtx.fill();
  }

  function spawnParticle(x,y,color,speed){
    particles.push({
      x:x, y:y,
      vx:(Math.random()-0.5)*7*speed, vy:(Math.random()-0.5)*7*speed,
      life:1, decay: 0.025+Math.random()*0.02,
      r: 1.6+Math.random()*2.6, color:color
    });
    if(particles.length>220) particles.splice(0, particles.length-220);
  }

  function spawnRipple(x,y,color){
    ripples.push({ x:x, y:y, r:4, maxR:44, life:1, color:color });
  }

  function checkMajorCrossing(key, angleDeg, x, y, color){
    var prev = lastCometAngles[key];
    lastCometAngles[key] = angleDeg;
    if(prev===undefined) return false;
    var prevSector = Math.floor(((prev%360)+360)%360 / 90);
    var curSector = Math.floor(((angleDeg%360)+360)%360 / 90);
    if(prevSector !== curSector){ spawnRipple(x,y,color); return true; }
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
        var wobble = Math.sin(t*1.6 + i*2.1 + f*7.5) * 7 * (0.3+weight);
        ctx.lineTo(bx + nx*wobble, by + ny*wobble);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 + weight*2;
      ctx.globalAlpha = 0.14 + weight*0.24;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function render(state, rings){
    var t = performance.now()/1000;
    ctx.clearRect(0,0,1000,1000);
    gctx.clearRect(0,0,1000,1000);

    var cometPositions = [[500,500]];
    var crossed = [];

    var spherePulse = 0.5 + 0.5*Math.sin(state.pulsePhase*Math.PI*2);
    drawGlow(gctx, [500,500], state.fluxColor, 70 + spherePulse*22, 0.45 + spherePulse*0.2);

    rings.forEach(function(ring, idx){
      var hsl = hexToHsl(ring.color);
      var cpos = drawBraidRing(ctx, {
        cx:500, cy:500, radius:ring.radius, count:36, majorEvery:9,
        hueAnchor: hsl[0], cometAngle: ring.angle, time:t,
        shimmerSpeed: ring.shimmerSpeed, alphaScale:1
      });

      if(ring.miniOf){
        var spacing = 360/36;
        for(var i=0;i<36;i+=9){
          var pos = pointAt(i*spacing, ring.radius, 500, 500);
          drawBraidRing(ctx, {
            cx:pos[0], cy:pos[1], radius: ring.radius*0.082, count:12, majorEvery:3,
            hueAnchor: hexToHsl(ring.miniOf.color)[0], cometAngle: ring.miniOf.angle,
            time:t, shimmerSpeed: ring.miniOf.shimmerSpeed*1.4, alphaScale:0.55, circRatio:0.2, hueSpread:220
          });
          drawCometGlow(ctx, pointAt(ring.miniOf.angle, ring.radius*0.082, pos[0], pos[1]), ring.miniOf.color, 1.8, 0.65);
        }
      }

      drawCometGlow(gctx, cpos, ring.color, ring.cometR, 1);
      cometPositions.push(cpos);

      if(Math.random() < 0.5) spawnParticle(cpos[0], cpos[1], ring.color, 0.4+state.densityWeight);
      if(checkMajorCrossing(ring.key, ring.angle, cpos[0], cpos[1], ring.color)) crossed.push(ring.key);
    });

    drawFlux(cometPositions, state.fluxColor, state.densityWeight, t);

    for(var i=particles.length-1;i>=0;i--){
      var p = particles[i];
      p.x += p.vx*0.14; p.y += p.vy*0.14;
      p.life -= p.decay;
      if(p.life<=0){ particles.splice(i,1); continue; }
      gctx.beginPath();
      gctx.fillStyle = p.color;
      gctx.globalAlpha = p.life*0.75;
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
      gctx.globalAlpha = r.life*0.5;
      gctx.lineWidth = 2.5;
      gctx.arc(r.x, r.y, r.r, 0, Math.PI*2);
      gctx.stroke();
    }
    gctx.globalAlpha = 1;

    ctx.save();
    ctx.filter = 'blur(7px)';
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.85;
    ctx.drawImage(glow, 0, 0, canvas.width, canvas.height, 0, 0, 1000, 1000);
    ctx.restore();

    ctx.save();
    ctx.filter = 'blur(11px)';
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.32;
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

  return { render: render, resize: resize };
}
