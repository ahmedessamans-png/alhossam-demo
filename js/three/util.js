// DRYV 3D layer: shared helpers (renderer, environment, procedural textures, disposal).
// Everything here is generated in code, so the 3D layer ships no image textures at all.
import * as THREE from 'three';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

// One renderer per host. Transparent so the CSS still image underneath can cross-fade.
export function makeRenderer(host, tier, { shadows = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'x3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: tier >= 2, alpha: true, powerPreference: 'high-performance', stencil: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier >= 2 ? 1.5 : 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.0;
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  host.appendChild(canvas);
  return renderer;
}

// Studio reflections without an HDRI download: three's RoomEnvironment through PMREM.
export async function studioEnvironment(renderer) {
  const { RoomEnvironment } = await import('../../vendor/three/examples/jsm/environments/RoomEnvironment.js');
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const target = pmrem.fromScene(room, 0.035);
  room.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  pmrem.dispose();
  return target;
}

// Height field (Float32Array, w*h, values 0..1) to a tangent-space normal map.
export function heightToNormal(height, w, h, strength = 2.0) {
  const data = new Uint8Array(w * h * 4);
  const at = (x, y) => height[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      data[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// Braided rope: two families of strands crossing on the diagonal, over-under like a real braid.
export function braidNormalMap(size = 128) {
  const w = size, h = size, hf = new Float32Array(w * h);
  const strands = 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const a = (u * strands + v * strands) % 1;          // strand family A
      const b = (u * strands - v * strands + 8) % 1;      // strand family B
      const ha = Math.sin(Math.PI * a), hb = Math.sin(Math.PI * b);
      const over = (Math.floor(u * strands * 2) + Math.floor(v * strands * 2)) % 2;   // which family is on top
      const fib = 0.08 * Math.sin((a * 9 + v * 3) * Math.PI * 2);                    // fibre twist
      hf[y * w + x] = (over ? Math.max(ha, hb * 0.7) : Math.max(hb, ha * 0.7)) + fib;
    }
  }
  return heightToNormal(hf, w, h, 3.2);
}



// Concrete wall: low-frequency value noise for colour and roughness.
export function concreteMap(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const g = 16, grid = new Float32Array((g + 1) * (g + 1));
  let s = 11; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * g, gy = (y / size) * g, ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const G = (a, b) => grid[(b % g) * (g + 1) + (a % g)];
      const n = lerp(lerp(G(ix, iy), G(ix + 1, iy), sx), lerp(G(ix, iy + 1), G(ix + 1, iy + 1), sx), sy);
      const v = 200 + n * 40 + rnd() * 14;
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function disposeScene(scene) {
  scene.traverse((o) => {
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    mats.forEach((m) => {
      Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); });
      m.dispose();
    });
  });
}

export function disposeRenderer(renderer) {
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
}
