export function initBG(canvas){
  var ctx = canvas.getContext('2d');
  var stars = [];
  var tiltX = 0, tiltY = 0;

  function resize(){
    var rect = canvas.getBoundingClientRect();
    if(rect.width < 1) return;
    var dpr = Math.min(window.devicePixelRatio||1, 2);
    canvas.width = rect.width*dpr; canvas.height = rect.height*dpr;
    var s = (rect.width*dpr)/1000;
    ctx.setTransform(s,0,0,s,0,0);
    if(stars.length === 0){
      for(var i=0;i<160;i++){
        stars.push({
          x: Math.random()*1000, y: Math.random()*1000,
          r: Math.random()*1.4+0.3, tw: Math.random()*Math.PI*2,
          depth: 0.3+Math.random()*0.7
        });
      }
    }
  }

  function handleOrientation(e){
    if(e.gamma===null || e.beta===null) return;
    tiltX = Math.max(-1, Math.min(1, e.gamma/30));
    tiltY = Math.max(-1, Math.min(1, (e.beta-45)/30));
  }
  try{
    if(window.DeviceOrientationEvent){
      window.addEventListener('deviceorientation', handleOrientation);
    }
  }catch(e){}

  function render(state){
    var t = performance.now()/1000;
    ctx.clearRect(0,0,1000,1000);

    var warm = [245,167,66], cool=[58,184,216];
    var w = state.densityWeight;
    var r = Math.round(cool[0]+(warm[0]-cool[0])*w);
    var g = Math.round(cool[1]+(warm[1]-cool[1])*w);
    var b = Math.round(cool[2]+(warm[2]-cool[2])*w);
    var grad = ctx.createRadialGradient(500,500,40,500,500,520);
    grad.addColorStop(0, 'rgba('+r+','+g+','+b+',0.16)');
    grad.addColorStop(0.55, 'rgba(10,7,20,0.55)');
    grad.addColorStop(1, 'rgba(2,1,6,0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,1000,1000);

    stars.forEach(function(s){
      var tw = 0.55 + 0.45*Math.sin(t*1.2 + s.tw);
      var px = s.x + tiltX*22*s.depth;
      var py = s.y + tiltY*22*s.depth;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,'+(tw*0.85)+')';
      ctx.arc(px, py, s.r, 0, Math.PI*2);
      ctx.fill();
    });
  }

  window.addEventListener('resize', resize);
  resize();

  return { render: render, resize: resize };
}
