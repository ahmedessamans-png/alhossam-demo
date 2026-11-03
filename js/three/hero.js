// DRYV hero stage. The live version of the intro film's last frame: the extruded steel DRYV wordmark
// (exported from the same Blender file as the intro, so it is the approved wordmark, not a redraw),
// held by braided black gym ropes in front of a concrete wall.
// Pointer moves a hard light across the steel; scrolling releases the ropes and pushes the camera in.
// Nothing here blocks scrolling: scroll is only read, never prevented.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/three/examples/jsm/libs/meshopt_decoder.module.js';
import {
  makeRenderer, studioEnvironment, braidNormalMap, concreteMap, disposeScene, disposeRenderer,
  clamp, lerp, easeOutExpo, easeOutCubic, easeInOut
} from './util.js?v=20261102x2';

const WORDMARK = { 2: 'assets/3d/dryv-wordmark.glb', 1: 'assets/3d/dryv-wordmark-lod1.glb' };

// Rope paths in wordmark units: the wordmark spans x -0.5..0.5, y about -0.17..0.17, front face at z 0.035.
// Ends are pushed far off frame in code, so no cut rope end is ever on screen.
const ROPES = [
  { r: 0.017, pts: [[-1.5, -0.62, 0.22], [-0.58, -0.15, 0.08], [-0.2, 0.0, 0.058], [0.16, 0.08, 0.06], [0.62, 0.24, 0.12], [1.5, 0.66, 0.2]] },
  { r: 0.02, pts: [[-1.7, 0.05, -0.12], [-0.42, -0.04, -0.07], [0.4, 0.05, -0.07], [1.7, -0.06, -0.14]] },
  { r: 0.008, pts: [[-0.32, 1.2, 0.2], [-0.13, 0.2, 0.05], [0.04, -0.05, 0.048], [0.36, -0.9, 0.22]] },
  { r: 0.008, pts: [[1.7, 0.16, 0.08], [0.46, 0.08, 0.05], [0.26, 0.19, 0.0], [0.21, 0.05, -0.05], [0.31, -0.1, 0.0], [0.1, -0.13, 0.05], [-1.7, -0.46, 0.14]] }
];

export async function create(host, { tier }) {
  const shadows = tier >= 2;
  const renderer = makeRenderer(host, tier, { shadows });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
  const envRT = await studioEnvironment(renderer);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;

  // ---- wall
  const wallTex = concreteMap(256); wallTex.repeat.set(3, 2);
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 9),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3c, map: wallTex, roughness: 0.94, metalness: 0, envMapIntensity: 0.25 })
  );
  wall.position.z = -0.62; wall.receiveShadow = shadows; scene.add(wall);

  // ---- lights
  const key = new THREE.DirectionalLight(0xfff4ea, 2.1);         // hard key from top left: crisp rope shadows on the wall
  key.position.set(-2.2, 2.6, 3.0);
  if (shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -2.4, right: 2.4, top: 1.6, bottom: -1.6, near: 0.5, far: 9 });
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.015; key.shadow.radius = 3;
  }
  scene.add(key);
  const wash = new THREE.SpotLight(0xf2efe9, 9, 7, 0.75, 1, 1.6);   // soft wash keeps the wall a mid grey, not a black void
  wash.position.set(0.2, 2.4, 1.2); wash.target.position.set(0, 0.1, -0.62);
  scene.add(wash, wash.target);
  const torch = new THREE.SpotLight(0xffffff, 26, 6, 0.32, 0.85, 1.4);   // follows the pointer: the glint on the steel
  torch.position.set(-1.4, 0.4, 1.6);
  scene.add(torch, torch.target);
  const rim = new THREE.PointLight(0xdfe8ff, 1.2, 4, 1.6); rim.position.set(1.4, 1.0, 0.4); scene.add(rim);

  // ---- wordmark
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(WORDMARK[tier] || WORDMARK[1]);
  const steel = new THREE.MeshPhysicalMaterial({
    color: 0xd4d7da, metalness: 1, roughness: 0.22, clearcoat: 0.35, clearcoatRoughness: 0.18, envMapIntensity: 1.7
  });
  const mark = new THREE.Group();
  gltf.scene.traverse((o) => {
    if (o.isMesh) { o.material = steel; o.castShadow = shadows; o.receiveShadow = shadows; }
  });
  mark.add(gltf.scene);
  scene.add(mark);

  // ---- ropes
  const braid = braidNormalMap(128);
  const ropeMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b0b0b, roughness: 0.82, metalness: 0, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x262626),
    normalMap: braid, normalScale: new THREE.Vector2(1.1, 1.1), envMapIntensity: 0.6
  });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.6, metalness: 0, envMapIntensity: 0.5 });
  const ropeGroup = new THREE.Group(); mark.add(ropeGroup);
  const UP = new THREE.Vector3(0, 1, 0);
  const ropes = ROPES.map((def, i) => {
    const pts = def.pts.map((p) => new THREE.Vector3(...p));
    // extend each end off frame in the wall plane only (never toward the camera, or the rope balloons)
    const ext = (p, q) => { const d = p.clone().sub(q); d.z = 0; return p.clone().add(d.normalize().multiplyScalar(2.2)); };
    const a = ext(pts[0], pts[1]), b = ext(pts[pts.length - 1], pts[pts.length - 2]);
    const curve = new THREE.CatmullRomCurve3([a, ...pts, b], false, 'centripetal');
    const seg = (def.r > 0.012 ? 300 : 220) * (tier >= 2 ? 1 : 0.6) | 0;
    const radial = def.r > 0.012 ? (tier >= 2 ? 14 : 10) : 8;
    const geo = new THREE.TubeGeometry(curve, seg, def.r, radial, false);
    const m = ropeMat.clone();
    m.normalMap = braid;
    const tex = braid.clone(); tex.needsUpdate = true;
    tex.repeat.set(curve.getLength() / (def.r * 5.5), 1); m.normalMap = tex;
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = shadows; mesh.receiveShadow = shadows;
    ropeGroup.add(mesh);
    // sealed battle-rope end caps (never a sliced cross-section)
    const capGeo = new THREE.CapsuleGeometry(def.r * 1.06, def.r * 2.6, 4, radial);
    const tip = new THREE.Mesh(capGeo, capMat), tail = new THREE.Mesh(capGeo, capMat);
    tip.castShadow = tail.castShadow = shadows;
    ropeGroup.add(tip, tail);
    return { def, curve, geo, mesh, tip, tail, seg, radial, delay: 0.12 + i * 0.11 };
  });
  const tmpT = new THREE.Vector3();
  function placeCap(cap, r, curve, f, dir) {
    const p = curve.getPointAt(clamp(f, 0.0005, 0.9995));
    curve.getTangentAt(clamp(f, 0.0005, 0.9995), tmpT);
    cap.quaternion.setFromUnitVectors(UP, tmpT);
    cap.position.copy(p).addScaledVector(tmpT, -dir * r * 1.1);
  }
  function setRope(R, from, to) {
    const per = R.radial * 6;
    const s = Math.floor(clamp(from) * R.seg), e = Math.max(s, Math.floor(clamp(to) * R.seg));
    R.geo.setDrawRange(s * per, (e - s) * per);
    R.mesh.visible = e > s;
    R.tip.visible = R.mesh.visible && to < 0.999;
    R.tail.visible = R.mesh.visible && from > 0.001;
    if (R.tip.visible) placeCap(R.tip, R.def.r, R.curve, e / R.seg, 1);
    if (R.tail.visible) placeCap(R.tail, R.def.r, R.curve, s / R.seg, -1);
  }

  // ---- chalk dust in the light
  const N = tier >= 2 ? 650 : 260;
  const dpos = new Float32Array(N * 3), dseed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    dpos[i * 3] = (Math.random() - 0.5) * 3.4; dpos[i * 3 + 1] = (Math.random() - 0.5) * 2.0; dpos[i * 3 + 2] = -0.5 + Math.random() * 1.6;
    dseed[i] = Math.random();
  }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  dgeo.setAttribute('seed', new THREE.BufferAttribute(dseed, 1));
  const dmat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uTorch: { value: new THREE.Vector3() }, uFade: { value: 0 } },
    vertexShader: `
      attribute float seed; uniform float uTime, uScale; uniform vec3 uTorch; varying float vA;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.012 + seed * 0.02) + 1.0, 2.0) - 1.0;
        p.x += sin(uTime * 0.3 + seed * 40.0) * 0.03;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.0, (0.006 + seed * 0.01) * uScale / -mv.z);
        float beam = 1.0 - smoothstep(0.15, 0.9, distance(p.xy, uTorch.xy));
        vA = (0.18 + 0.55 * beam) * (0.4 + 0.6 * seed);
      }`,
    fragmentShader: `
      uniform float uFade; varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
        gl_FragColor = vec4(vec3(0.95, 0.94, 0.92), (1.0 - d * 2.0) * vA * uFade); }`
  });
  const dust = new THREE.Points(dgeo, dmat); scene.add(dust);

  // ---- layout: wordmark sits in the upper half so the headline and buttons keep the lower third
  let W = 1, yc = 0, visW = 1, visH = 1, camZ = 3.4;
  function layout() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1, aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect; camera.updateProjectionMatrix();
    visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camZ; visW = visH * aspect;
    W = aspect < 0.9 ? visW * 0.8 : Math.min(1.7, visW * 0.5);
    yc = visH * (aspect < 0.9 ? 0.28 : 0.17);
    mark.scale.setScalar(W);
    dmat.uniforms.uScale.value = h * renderer.getPixelRatio() * 0.5;
  }
  layout();
  const ro = new ResizeObserver(layout); ro.observe(host);

  // ---- input: pointer and scroll are read, never captured
  const ptr = { x: -0.6, y: 0.3, tx: -0.6, ty: 0.3, live: false };
  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
    ptr.live = true;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  let scrollP = 0;
  const onScroll = () => { const r = host.getBoundingClientRect(); scrollP = clamp(-r.top / Math.max(1, r.height)); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---- loop
  let raf = 0, running = false, t0 = 0, shown = false, last = performance.now(), time = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    if (!t0) t0 = now;
    const E = (now - t0) / 1000;                      // entrance clock, everything settles by 2.4 s

    renderer.toneMappingExposure = lerp(0.0, 1.0, easeOutCubic(E / 1.0));
    const rise = easeOutExpo((E - 0.15) / 1.5);
    const s = easeInOut(scrollP);

    // pointer smoothing; before the first pointer move the torch runs its own sweep, then a slow drift
    const k = 1 - Math.pow(0.0015, dt);
    if (!ptr.live) {
      const sweep = easeInOut((E - 0.3) / 1.6);
      ptr.tx = E < 2.0 ? lerp(-1.1, 0.75, sweep) : 0.75 * Math.cos((E - 2.0) * 0.35) ;
      ptr.ty = E < 2.0 ? 0.25 : 0.2 + 0.25 * Math.sin((E - 2.0) * 0.5);
    }
    ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k;

    // camera: gentle parallax from the pointer, dolly toward the D as the hero scrolls away
    camera.position.set(ptr.x * 0.11, ptr.y * 0.06 + s * yc * 0.6, lerp(camZ, camZ - 0.8, s));
    camera.lookAt(0, s * yc * 0.9, 0);

    mark.position.set(0, yc + lerp(-0.07, 0, rise), lerp(0, 0.18, s));
    mark.rotation.set(lerp(0.32, 0, rise) + s * 0.2 + ptr.y * -0.035, ptr.x * 0.06, 0);

    // torch target follows the pointer over the wordmark plane
    torch.position.set(ptr.x * visW * 0.45, yc + ptr.y * visH * 0.35 + 0.35, 1.5);
    torch.target.position.set(ptr.x * visW * 0.3, yc + ptr.y * visH * 0.2, 0);
    torch.intensity = lerp(0, 26, easeOutCubic(E / 0.8));
    dmat.uniforms.uTorch.value.set(torch.target.position.x, torch.target.position.y, 0);
    dmat.uniforms.uTime.value = time;
    dmat.uniforms.uFade.value = easeOutCubic(E / 1.4) * (1 - s * 0.6);

    // ropes reach in from the edges, then slide out as you scroll (staggered, cords first)
    ropes.forEach((R, i) => {
      const inn = easeInOut((E - R.delay) / 1.1);
      const rel = clamp(s * 1.6 - (R.def.r < 0.012 ? 0 : 0.25));
      setRope(R, easeInOut(rel), inn);
    });

    renderer.render(scene, camera);
    if (!shown) { shown = true; host.classList.add('is-3d-live'); }
  }
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  return {
    start, stop,
    dispose() {
      stop(); ro.disconnect();
      window.removeEventListener('pointermove', onMove); window.removeEventListener('scroll', onScroll);
      host.classList.remove('is-3d-live');
      disposeScene(scene); envRT.dispose(); braid.dispose(); disposeRenderer(renderer);
    }
  };
}
