import * as THREE from './vendor/three.module.min.js';

export function initSphere3D(canvas){
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 10);
  camera.position.set(0, 0, 4.2);

  var geo = new THREE.SphereGeometry(0.1, 72, 72);
  var mat = new THREE.MeshPhysicalMaterial({
    color: 0xf5c842,
    emissive: 0x3a1e00,
    emissiveIntensity: 0.35,
    metalness: 0.55,
    roughness: 0.28,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25
  });
  var sphere = new THREE.Mesh(geo, mat);
  scene.add(sphere);

  var key = new THREE.PointLight(0xfff2c9, 5.5, 12, 2);
  key.position.set(-2.2, 2.0, 3.0);
  scene.add(key);

  var rim = new THREE.PointLight(0x7b58d4, 2.2, 14, 2);
  rim.position.set(2.4, -1.6, 1.8);
  scene.add(rim);

  scene.add(new THREE.AmbientLight(0x2a1a08, 1.1));

  var warmColor = new THREE.Color(0xf5a742);
  var coolColor = new THREE.Color(0x3ab8d8);
  var baseEmissive = new THREE.Color(0x3a1e00);

  function resize(){
    var rect = canvas.getBoundingClientRect();
    if(rect.width < 1 || rect.height < 1) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width/rect.height;
    camera.updateProjectionMatrix();
  }

  var t0 = performance.now();

  function update(state){
    var t = (performance.now()-t0)/1000;
    sphere.rotation.y = t*0.12;
    sphere.rotation.x = Math.sin(t*0.05)*0.08;

    var pulseScale = 1 + 0.085*Math.sin(state.pulsePhase*Math.PI*2);
    sphere.scale.setScalar(pulseScale);

    var tint = coolColor.clone().lerp(warmColor, state.densityWeight);
    mat.color.copy(tint);
    mat.emissive.copy(baseEmissive).lerp(tint, 0.5 + 0.3*Math.sin(state.pulsePhase*Math.PI*2));
    mat.emissiveIntensity = 0.3 + 0.25*Math.sin(state.pulsePhase*Math.PI*2);

    key.intensity = 5.0 + 1.2*Math.sin(state.pulsePhase*Math.PI*2);

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', resize);
  resize();

  return { update: update, resize: resize };
}
