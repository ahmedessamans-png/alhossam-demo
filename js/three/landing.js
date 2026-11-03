// DRYV hero stage: the live continuation of the intro film. The film ends on the steel wordmark standing on a
// cracked concrete floor in hanging dust; this scene picks up exactly there, so the site feels like the same room.
// Wordmark comes from the same Blender file as the film, so it is the approved wordmark, not a redraw.
// Pointer moves a light across the steel. Scrolling is only read, never captured.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/three/examples/jsm/libs/meshopt_decoder.module.js';
import { makeRenderer, studioEnvironment, disposeScene, disposeRenderer, clamp, lerp, easeOutExpo, easeOutCubic, easeInOut } from './util.js?v=20261102x2';

const WORDMARK = { 2: 'assets/3d/dryv-wordmark.glb', 1: 'assets/3d/dryv-wordmark-lod1.glb' };
const INK = 0x0b0b0b;

// Concrete with the impact cracks from the film, drawn once to a canvas. No image downloads.
function floorTexture(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#1c1c1d'; g.fillRect(0, 0, size, size);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400; i++) {                        // mottled concrete
    const v = 22 + r() * 16 | 0, a = 0.04 + r() * 0.08;
    g.fillStyle = `rgba(${v},${v},${v + 1},${a})`;
    g.beginPath(); g.arc(r() * size, r() * size, 4 + r() * size * 0.05, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,.9)'; g.lineCap = 'round';
  const cx = size / 2, cy = size * 0.46;
  const crack = (x, y, a, len, w) => {                    // jagged cracks that fork as they thin out
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
    const n = 6 + r() * 5 | 0;
    for (let i = 0; i < n; i++) {
      a += (r() - 0.5) * 0.8; x += Math.cos(a) * len / n; y += Math.sin(a) * len / n; g.lineTo(x, y);
      if (w > 0.8 && r() < 0.3) { g.stroke(); crack(x, y, a + (r() - 0.5) * 1.6, len * 0.45, w * 0.6); g.lineWidth = w; g.beginPath(); g.moveTo(x, y); }
    }
    g.stroke();
  };
  for (let i = 0; i < 16; i++) crack(cx + (r() - 0.5) * size * 0.34, cy + (r() - 0.5) * size * 0.03, r() * 6.28, size * (0.1 + r() * 0.2), 2.4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

// Soft shaft of light behind the wordmark. A cheap cone, no ray-marching.
function lightShaft() {
  const geo = new THREE.ConeGeometry(1.5, 3.2, 40, 1, true);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uA: { value: 0 } },
    vertexShader: `varying vec2 vU; varying vec3 vN; varying vec3 vV;
      void main(){ vU=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec2 vU; varying vec3 vN; varying vec3 vV; uniform float uA;
      void main(){ float e=pow(abs(dot(vN,vV)),2.2); float f=smoothstep(0.,.75,vU.y)*smoothstep(1.,.75,vU.y);
        gl_FragColor=vec4(vec3(.92,.88,.82),e*f*uA); }`
  });
  return new THREE.Mesh(geo, mat);
}

function dustField(n, spread) {
  const geo = new THREE.BufferGeometry(), p = new Float32Array(n * 3), q = new Float32Array(n);
  let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    p[i * 3] = (r() - 0.5) * spread; p[i * 3 + 1] = r() * 1.5 - 0.17; p[i * 3 + 2] = (r() - 0.5) * 1.8; q[i] = r();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(q, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uFade: { value: 0 }, uScale: { value: 400 }, uLight: { value: new THREE.Vector3() } },
    vertexShader: `attribute float aSeed; uniform float uTime,uScale; uniform vec3 uLight; varying float vA;
      void main(){ vec3 p=position; float t=uTime*(.012+aSeed*.02);
        p.x+=sin(t*3.+aSeed*40.)*.14; p.y=mod(p.y+.17+t,1.5)-.17; p.z+=cos(t*2.+aSeed*20.)*.1;
        vec4 mv=modelViewMatrix*vec4(p,1.); float d=length(p.xy-uLight.xy);
        vA=(.1+.5*aSeed)*(.35+.65*smoothstep(1.,.1,d)); gl_PointSize=uScale*(.003+aSeed*.008)/-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; uniform float uFade;
      void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(vec3(.93,.91,.87),pow(1.-d*2.,1.6)*vA*uFade); }`
  });
  return new THREE.Points(geo, mat);
}

export async function create(host, { tier }) {
  const shadows = tier >= 2;
  const renderer = makeRenderer(host, tier, { shadows });
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  scene.fog = new THREE.Fog(INK, 2.6, 7);
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 30);
  const envRT = await studioEnvironment(renderer);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.5;

  const FLOOR_Y = -0.17;
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x9fa3a9, metalness: 1, roughness: 0.27, clearcoat: 0.25, clearcoatRoughness: 0.2, envMapIntensity: 1.5 });
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(WORDMARK[tier] || WORDMARK[1]);
  gltf.scene.traverse((o) => { if (o.isMesh) { o.material = steel; o.castShadow = shadows; } });
  const box = new THREE.Box3().setFromObject(gltf.scene);
  gltf.scene.position.y -= box.min.y + 0.17;              // stand the letters on the floor
  const mark = new THREE.Group(); mark.add(gltf.scene); scene.add(mark);

  // reflection: a mirrored copy under a floor that is not quite opaque. Cheap, and reads as polished concrete.
  const mirrorMat = steel.clone(); mirrorMat.envMapIntensity = 0.7;
  const mirror = gltf.scene.clone(true);
  mirror.traverse((o) => { if (o.isMesh) { o.material = mirrorMat; o.castShadow = false; } });
  const mirrorG = new THREE.Group(); mirrorG.add(mirror); mirrorG.scale.y = -1; mirrorG.position.y = FLOOR_Y * 2;
  scene.add(mirrorG);

  const ftex = floorTexture(tier >= 2 ? 2048 : 1024);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18),
    new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.62, metalness: 0.05, transparent: true, opacity: 0.86, envMapIntensity: 0.5 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR_Y; floor.receiveShadow = shadows; scene.add(floor);

  const key = new THREE.SpotLight(0xfff1e4, 13, 8, 0.6, 0.9, 1.5);
  key.position.set(-1.4, 2.2, 1.6); key.target.position.set(0, 0, 0);
  if (shadows) { key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.012; key.shadow.radius = 5; }
  scene.add(key, key.target);
  const back = new THREE.SpotLight(0xf3ece2, 6, 7, 0.75, 1, 1.5);    // the pool of light behind the letters, as in the film
  back.position.set(0, 1.5, -2.2); back.target.position.set(0, FLOOR_Y, 0.4); scene.add(back, back.target);
  const torch = new THREE.SpotLight(0xffffff, 0, 6, 0.3, 0.85, 1.4); // follows the pointer: the glint on the steel
  scene.add(torch, torch.target);

  const shaft = lightShaft(); shaft.position.set(0, 0.95, -1.1); scene.add(shaft);
  const dust = dustField(tier >= 2 ? 420 : 150, 3.4); scene.add(dust);

  let visW = 1, visH = 1, camZ = 3.4, wideK = 1, yShift = 0;
  function layout() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1, aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    const want = aspect < 0.9 ? 1.35 : 2.9;                // how wide the scene must fit
    camZ = (want / aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camZ = Math.max(camZ, 2.6);
    if (aspect > 1.2) camera.setViewOffset(w, h, -w * 0.26, 0, w, h); else camera.clearViewOffset();  // desktop: logo right, headline left
    scene.fog.near = camZ + 0.5; scene.fog.far = camZ + 4.2;
    camera.updateProjectionMatrix();
    visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camZ; visW = visH * aspect;
    yShift = aspect < 0.9 ? visH * 0.17 : visH * 0.13;     // wordmark above the headline and buttons
    dust.material.uniforms.uScale.value = h * renderer.getPixelRatio() * 0.9;
  }
  layout();
  const ro = new ResizeObserver(layout); ro.observe(host);

  const ptr = { x: 0.5, y: 0.2, tx: 0.5, ty: 0.2, live: false };
  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1; ptr.ty = -(((e.clientY - r.top) / r.height) * 2 - 1); ptr.live = true;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  let scrollP = 0;
  const onScroll = () => { const r = host.getBoundingClientRect(); scrollP = clamp(-r.top / Math.max(1, r.height)); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  let raf = 0, running = false, t0 = 0, shown = false, last = performance.now(), time = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    if (!t0) t0 = now;
    const E = (now - t0) / 1000, s = easeInOut(scrollP);
    renderer.toneMappingExposure = lerp(0, 1.15, easeOutCubic(E / 1.2));

    const k = 1 - Math.pow(0.002, dt);
    if (!ptr.live) { ptr.tx = 0.6 * Math.cos(E * 0.3); ptr.ty = 0.25 + 0.2 * Math.sin(E * 0.45); }
    ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k;

    // entrance settles from the film's closing push-in; scrolling keeps moving through the same space
    const settle = easeOutExpo(E / 2.2);
    const z = lerp(camZ * 0.86, camZ, settle) - s * 0.9;
    camera.position.set(ptr.x * 0.09, 0.03 + ptr.y * 0.035 - yShift * 0.25 + s * 0.22, z);
    camera.lookAt(0, -yShift * 0.9 + 0.02 + s * 0.05, 0);

    torch.position.set(ptr.x * visW * 0.42, 0.25 + ptr.y * 0.5, 1.3);
    torch.target.position.set(ptr.x * visW * 0.3, 0.02 + ptr.y * 0.12, 0);
    torch.intensity = lerp(0, 16, easeOutCubic((E - 0.3) / 1));
    shaft.material.uniforms.uA.value = lerp(0, 0.13, easeOutCubic(E / 1.6)) * (1 - s * 0.7);
    dust.material.uniforms.uTime.value = time + s * 20;
    dust.material.uniforms.uLight.value.set(torch.target.position.x, torch.target.position.y, 0);
    dust.material.uniforms.uFade.value = easeOutCubic(E / 1.4);

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
      disposeScene(scene); envRT.dispose(); disposeRenderer(renderer);
    }
  };
}
