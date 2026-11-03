# DRYV 3D layer (2 Nov 2026)

Progressive enhancement on the existing vanilla SPA. No build step, no React, no scroll-jacking.

Files
- js/three/stage.js   loader + lifecycle. Waits for load + idle, picks a tier, mounts scenes on [data-3d] hosts near the viewport,
                      pauses offscreen or in hidden tabs, disposes on SPA route change. QA override: ?x3d=0|1|2
- js/three/hero.js    hero stage: steel DRYV wordmark (exported from the intro .blend), braided ropes with sealed end caps,
                      concrete wall with soft shadows, pointer-driven light, chalk dust, scroll dolly and rope release.
- js/three/util.js    renderer, studio environment (RoomEnvironment PMREM), procedural braid/concrete maps, disposal.
- js/depth.js         pointer tilt + light sheen on product cards and image tiles (fine pointers only).
- x3d.css             canvas cross-fade, tilt, CSS scroll-driven parallax and product focus (animation-timeline: view()).
- assets/3d/dryv-wordmark.glb (7.6k tris, 34 KB, meshopt) and dryv-wordmark-lod1.glb (2.5k tris, 17 KB) for phones.
- vendor/three (r168): three.module.min.js, GLTFLoader, BufferGeometryUtils, meshopt decoder, RoomEnvironment.

Tiers
- 0: reduced motion, Save-Data, < 4 GB RAM, < 4 cores or no WebGL2 -> stills only (the site as before).
- 1: small screens -> DPR 1.25, no shadows, LOD1 wordmark, fewer particles.
- 2: desktop -> DPR up to 1.5, soft shadows, full wordmark.

The hero still image stays in index.html and is the LCP element; WebGL fades in over it.
Retired: fabric swatch scene (_work/web3d/retired/fabric.js) - the real stretch photo reads better.

## 2 Nov 2026 late: hero is now js/three/landing.js
Continues the intro film: steel wordmark on the cracked concrete floor, mirrored reflection, light shaft, dust, pointer light,
scroll push-in (read only). Layout: logo right on desktop, above the headline on phones. R3F, React and GSAP stay out on purpose:
this site has no build step and the budget is Lighthouse 90+. Real 3D product cards need real garment models.
