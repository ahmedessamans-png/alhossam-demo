// textures.js — Procedural texture generators for DRYV intro barbell scene
// All functions return THREE.Texture or HTMLCanvasElement ready for Three.js

import * as THREE from 'three';

/**
 * Knurl normal map for barbell shaft grip
 * Cross-hatch diamond pattern at 45°
 */
export function createKnurlNormalMap() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base normal (pointing up)
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const frequency = 8; // diamonds across
  const amplitude = 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;

      // Diamond knurl pattern: alternating diagonal ridges
      const d1 = Math.sin((u + v) * frequency * Math.PI * 2);
      const d2 = Math.sin((u - v) * frequency * Math.PI * 2);
      const h = (d1 + d2) * 0.5 * amplitude;

      // Convert height to normal (derivative)
      const scale = 2 / size;
      const nx = -h * Math.sin((u + v) * frequency * Math.PI * 2) * frequency * Math.PI * 2 * scale;
      const ny = -h * Math.cos((u - v) * frequency * Math.PI * 2) * frequency * Math.PI * 2 * scale;
      const nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const r = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      const g = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      const b = Math.round(((nz / len) * 0.5 + 0.5) * 255);

      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 1); // Stretch along shaft
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Plate print texture: raised rubber nubs / logo areas
 * Used as bump map on bumper plates
 */
export function createPlatePrintTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dark base
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, size, size);

  // Subtle concentric rings (mold marks)
  for (let i = 0; i < 6; i++) {
    const r = (size * 0.45) - i * 12;
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // DRYV text emboss (faint, for close-ups)
  ctx.font = 'bold 64px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fillText('DRYV', size / 2, size / 2 - 20);
  ctx.fillText('20KG', size / 2, size / 2 + 40);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Plate roughness map: variation between rubber surface and printed areas
 */
export function createPlateRoughnessMap() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base roughness (rubber ~0.85)
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x - size / 2) / (size / 2);
      const v = (y - size / 2) / (size / 2);
      const r = Math.sqrt(u * u + v * v);

      let roughness = 0.85; // base rubber

      // Center hub area: slightly smoother (metal insert feel)
      if (r < 0.3) roughness = 0.65;

      // Printed ring areas: slightly rougher
      if (r > 0.35 && r < 0.55) roughness = 0.9;

      // Outer lip: smooth rubber
      if (r > 0.9) roughness = 0.8;

      const val = Math.round(roughness * 255);
      const i = (y * size + x) * 4;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Floor bump map: subtle concrete texture
 */
export function createFloorBumpMap() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Perlin-like noise using multiple octaves
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  function noise(x, y, seed = 0) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  }

  function fbm(x, y, octaves = 4) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let max = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * noise(x * frequency, y * frequency, i * 100);
      max += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value / max;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size * 8;
      const v = y / size * 8;
      const h = fbm(u, v, 5);
      const val = Math.round(h * 255);
      const i = (y * size + x) * 4;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Chalk particle sprite: soft circular particle
 * Returns HTMLCanvasElement for CanvasTexture
 */
export function createChalkSprite() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

/**
 * Bar end cap texture: DRYV logo emboss on chrome cap
 * Returns HTMLCanvasElement for CanvasTexture
 */
export function createBarEndCapTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Chrome base
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#dddddd');
  grad.addColorStop(0.5, '#aaaaaa');
  grad.addColorStop(1, '#666666');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle radial lines (machining marks)
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.02)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.lineTo(size / 2 + Math.cos(angle) * size / 2, size / 2 + Math.sin(angle) * size / 2);
    ctx.stroke();
  }

  // DRYV text (embossed)
  ctx.font = 'bold 48px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Highlight (top-left)
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('DRYV', size / 2 - 1, size / 2 - 1);

  // Shadow (bottom-right)
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText('DRYV', size / 2 + 1, size / 2 + 1);

  // Main text
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText('DRYV', size / 2, size / 2);

  return canvas;
}

/**
 * Collar texture: knurled clamp surface
 * Returns HTMLCanvasElement for CanvasTexture
 */
export function createCollarTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dark chrome base
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#333333');
  grad.addColorStop(0.5, '#1a1a1a');
  grad.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Knurl pattern (finer than shaft)
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;

  for (let i = 0; i < 24; i++) {
    const y = (i / 24) * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  for (let i = 0; i < 24; i++) {
    const x = (i / 24) * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  // Diagonal cross-hatch
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  for (let i = -24; i < 48; i++) {
    const offset = (i / 24) * size;
    ctx.beginPath();
    ctx.moveTo(-size, offset);
    ctx.lineTo(size * 2, offset + size * 2);
    ctx.stroke();
  }

  return canvas;
}

// Export for module and global
if (typeof module !== 'undefined') module.exports = {
  createKnurlNormalMap,
  createPlatePrintTexture,
  createPlateRoughnessMap,
  createFloorBumpMap,
  createChalkSprite,
  createBarEndCapTexture,
  createCollarTexture
};