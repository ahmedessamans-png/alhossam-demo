// scene.js — Three.js scene, barbell geometry, materials, and scroll timeline API
// All geometry in metres, real proportions per spec

import * as THREE from 'three';
import {
  createKnurlNormalMap,
  createPlatePrintTexture,
  createPlateRoughnessMap,
  createFloorBumpMap,
  createChalkSprite,
  createBarEndCapTexture,
  createCollarTexture
} from './textures.js';

export class DRYVScene {
  constructor(options = {}) {
    this.container = options.container;
    this.width = options.width || window.innerWidth;
    this.height = options.height || window.innerHeight;
    this.isMobile = this.width < 768;
    this.pixelRatio = Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 1.75);

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.composer = null;
    this.timeline = null;
    this.scrollTrigger = null;

    // Objects
    this.bar = null;
    this.plates = [];
    this.collars = [];
    this.floor = null;
    this.chalkParticles = null;
    this.spotLight = null;
    this.rimLight = null;

    // State
    this.loadProgress = 0;
    this.gateVisible = true;
    this.storyProgress = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.hasWebGL = this.checkWebGL();
    this.deviceMemory = navigator.deviceMemory || 4;

    // Camera paths for scroll story
    this.cameraPath = null;
    this.lookAtPath = null;
  }

  checkWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch (e) {
      return false;
    }
  }

  async init() {
    if (!this.hasWebGL || this.reducedMotion || this.deviceMemory <= 2) {
      this.fallbackMode = true;
      return this.initFallback();
    }

    try {
      await this.initRenderer();
      this.initScene();
      this.initCamera();
      this.initLights();
      this.initEnvironment();
      this.createBarbell();
      this.createFloor();
      this.createChalk();
      this.initPostProcessing();
      this.setupResize();
      return true;
    } catch (e) {
      console.warn('DRYV intro init failed, falling back:', e);
      this.fallbackMode = true;
      return this.initFallback();
    }
  }

  async initRenderer() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:block;z-index:1;';
    canvas.setAttribute('aria-hidden', 'true');
    this.container.appendChild(canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x0B0B0B);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0B0B0B);
    this.scene.fog = new THREE.FogExp2(0x0B0B0B, 0.15);
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.01, 100);
    this.camera.position.set(0, 0.6, 2.2);
    this.camera.lookAt(0, 0.1, 0);
  }

  initLights() {
    // Key spotlight from above
    this.spotLight = new THREE.SpotLight(0xffffff, 2.5);
    this.spotLight.position.set(0, 3, 1);
    this.spotLight.target.position.set(0, 0.05, 0);
    this.spotLight.angle = 0.45;
    this.spotLight.penumbra = 0.8;
    this.spotLight.decay = 2;
    this.spotLight.distance = 10;
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = this.isMobile ? 1024 : 2048;
    this.spotLight.shadow.mapSize.height = this.isMobile ? 1024 : 2048;
    this.spotLight.shadow.camera.near = 0.5;
    this.spotLight.shadow.camera.far = 10;
    this.spotLight.shadow.radius = 4;
    this.spotLight.shadow.bias = -0.0005;
    this.scene.add(this.spotLight);
    this.scene.add(this.spotLight.target);

    // Cool-white rim light from behind
    this.rimLight = new THREE.DirectionalLight(0xe0e8ff, 0.8);
    this.rimLight.position.set(0, 1.5, -3);
    this.rimLight.target.position.set(0, 0.5, 0);
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);

    // Subtle fill
    const fillLight = new THREE.DirectionalLight(0x222233, 0.3);
    fillLight.position.set(-2, 2, 2);
    this.scene.add(fillLight);
  }

  async initEnvironment() {
    // RoomEnvironment for reflections
    try {
      const { RoomEnvironment } = await import('../../vendor/three/examples/jsm/environments/RoomEnvironment.js');
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      pmremGenerator.compileEquirectangularShader();
      const envMap = pmremGenerator.fromScene(new RoomEnvironment(this.renderer)).texture;
      this.scene.environment = envMap;
      this.scene.envMapIntensity = 0.35;
    } catch (e) {
      console.warn('RoomEnvironment failed:', e);
    }
  }

  createBarbell() {
    this.bar = new THREE.Group();
    this.bar.name = 'barbell';
    this.scene.add(this.bar);

    // Materials
    const rubberMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x161616,
      roughness: 0.85,
      sheen: 0.3,
      sheenColor: 0x333333
    });

    const chromeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 1.0,
      roughness: 0.15,
      envMapIntensity: 1.0
    });

    const shaftMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xcccccc,
      metalness: 1.0,
      roughness: 0.35,
      normalMap: createKnurlNormalMap(),
      normalScale: new THREE.Vector2(0.5, 0.5),
      envMapIntensity: 1.0
    });

    const hubMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.3,
      envMapIntensity: 1.0
    });

    const platePrintTex = createPlatePrintTexture();
    const plateRoughnessTex = createPlateRoughnessMap();

    const plateMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x161616,
      roughness: 0.85,
      bumpMap: platePrintTex,
      bumpScale: 0.002,
      roughnessMap: plateRoughnessTex,
      envMapIntensity: 0.5
    });

    const collarMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x222222,
      metalness: 0.8,
      roughness: 0.25,
      map: createCollarTexture(),
      envMapIntensity: 0.5
    });

    // Bar dimensions (metres)
    const BAR_LENGTH = 2.20;
    const SHAFT_DIA = 0.028;
    const SLEEVE_DIA = 0.050;
    const SLEEVE_LENGTH = 0.415;
    const FLANGE_DIA = 0.075;
    const FLANGE_THICK = 0.03;
    const PLATE_DIA = 0.45;
    const PLATE_THICK = 0.065;
    const HUB_DIA = 0.15;
    const HOLE_DIA = 0.0505;
    const COLLAR_DIA = 0.07;
    const COLLAR_THICK = 0.04;

    // Shaft (knurled grip area)
    const shaftLength = BAR_LENGTH - 2 * (SLEEVE_LENGTH + FLANGE_THICK);
    const shaftGeo = new THREE.CylinderGeometry(SHAFT_DIA / 2, SHAFT_DIA / 2, shaftLength, 32);
    shaftGeo.rotateX(Math.PI / 2);
    const shaftMesh = new THREE.Mesh(shaftGeo, shaftMaterial);
    shaftMesh.castShadow = true;
    shaftMesh.receiveShadow = true;
    shaftMesh.name = 'shaft';
    this.bar.add(shaftMesh);

    // Sleeves (chrome)
    const sleeveGeo = new THREE.CylinderGeometry(SLEEVE_DIA / 2, SLEEVE_DIA / 2, SLEEVE_LENGTH, 32);
    sleeveGeo.rotateX(Math.PI / 2);

    const leftSleeve = new THREE.Mesh(sleeveGeo, chromeMaterial);
    leftSleeve.position.x = -(shaftLength / 2 + SLEEVE_LENGTH / 2);
    leftSleeve.castShadow = true;
    leftSleeve.name = 'leftSleeve';
    this.bar.add(leftSleeve);

    const rightSleeve = new THREE.Mesh(sleeveGeo, chromeMaterial);
    rightSleeve.position.x = shaftLength / 2 + SLEEVE_LENGTH / 2;
    rightSleeve.castShadow = true;
    rightSleeve.name = 'rightSleeve';
    this.bar.add(rightSleeve);

    // Flanges
    const flangeGeo = new THREE.CylinderGeometry(FLANGE_DIA / 2, FLANGE_DIA / 2, FLANGE_THICK, 32);
    flangeGeo.rotateX(Math.PI / 2);

    const leftFlange = new THREE.Mesh(flangeGeo, chromeMaterial);
    leftFlange.position.x = -(shaftLength / 2 + SLEEVE_LENGTH + FLANGE_THICK / 2);
    leftFlange.castShadow = true;
    this.bar.add(leftFlange);

    const rightFlange = new THREE.Mesh(flangeGeo, chromeMaterial);
    rightFlange.position.x = shaftLength / 2 + SLEEVE_LENGTH + FLANGE_THICK / 2;
    rightFlange.castShadow = true;
    this.bar.add(rightFlange);

    // End caps (with DRYV emboss)
    const capGeo = new THREE.CylinderGeometry(SLEEVE_DIA / 2, SLEEVE_DIA / 2, 0.01, 32);
    capGeo.rotateX(Math.PI / 2);
    const capMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x2a2a2a,
      metalness: 0.7,
      roughness: 0.3,
      map: createBarEndCapTexture(),
      envMapIntensity: 0.5
    });

    const leftCap = new THREE.Mesh(capGeo, capMaterial);
    leftCap.position.x = -(shaftLength / 2 + SLEEVE_LENGTH + FLANGE_THICK + 0.005);
    leftCap.castShadow = true;
    this.bar.add(leftCap);

    const rightCap = new THREE.Mesh(capGeo, capMaterial);
    rightCap.position.x = shaftLength / 2 + SLEEVE_LENGTH + FLANGE_THICK + 0.005;
    rightCap.castShadow = true;
    this.bar.add(rightCap);

    // Plates (4x 20kg bumpers)
    const platePositions = [
      { x: -(shaftLength / 2 + SLEEVE_LENGTH + FLANGE_THICK + PLATE_THICK / 2), side: 'left', index: 0 },
      { x: (shaftLength / 2 + SLEEVE_LENGTH + FLANGE_THICK + PLATE_THICK / 2), side: 'right', index: 1 },
      { x: -(shaftLength / 2 + SLEEVE_LENGTH + FLANGE_THICK + PLATE_THICK * 1.5), side: 'left', index: 2 },
      { x: (shaftLength / 2 + SLEEVE_LENGTH + FLANGE_THICK + PLATE_THICK * 1.5), side: 'right', index: 3 }
    ];

    // Create plate geometry with raised lip and recessed face
    const plateProfile = new THREE.Shape();
    const r = PLATE_DIA / 2;
    const lipHeight = 0.003;
    const faceDepth = 0.005;
    const hubR = HUB_DIA / 2;
    const holeR = HOLE_DIA / 2;

    // Outer lip
    plateProfile.moveTo(r, 0);
    plateProfile.lineTo(r, lipHeight);
    plateProfile.lineTo(r - 0.015, lipHeight);
    plateProfile.lineTo(r - 0.015, PLATE_THICK - faceDepth);
    plateProfile.lineTo(hubR + 0.02, PLATE_THICK - faceDepth);
    plateProfile.lineTo(hubR + 0.02, PLATE_THICK);
    plateProfile.lineTo(holeR, PLATE_THICK);
    plateProfile.lineTo(holeR, 0);
    plateProfile.closePath();

    const plateGeo = new THREE.LatheGeometry(plateProfile.getPoints(64), 64);
    plateGeo.rotateX(-Math.PI / 2);

    platePositions.forEach(pos => {
      const plate = new THREE.Mesh(plateGeo, plateMaterial);
      plate.position.x = pos.x;
      plate.castShadow = true;
      plate.receiveShadow = true;
      plate.userData = { originalX: pos.x, side: pos.side, loadOrder: pos.index };
      plate.visible = false; // Hidden until preloader reveals
      this.plates.push(plate);
      this.bar.add(plate);
    });

    // Collars
    const collarGeo = new THREE.CylinderGeometry(COLLAR_DIA / 2, COLLAR_DIA / 2, COLLAR_THICK, 32);
    collarGeo.rotateX(Math.PI / 2);

    const leftCollarPos = -(shaftLength / 2 + SLEEVE_LENGTH + FLANGE_THICK + PLATE_THICK * 2 + COLLAR_THICK / 2);
    const rightCollarPos = shaftLength / 2 + SLEEVE_LENGTH + FLANGE_THICK + PLATE_THICK * 2 + COLLAR_THICK / 2;

    const leftCollar = new THREE.Mesh(collarGeo, collarMaterial);
    leftCollar.position.x = leftCollarPos;
    leftCollar.visible = false;
    leftCollar.castShadow = true;
    this.collars.push(leftCollar);
    this.bar.add(leftCollar);

    const rightCollar = new THREE.Mesh(collarGeo, collarMaterial);
    rightCollar.position.x = rightCollarPos;
    rightCollar.visible = false;
    rightCollar.castShadow = true;
    this.collars.push(rightCollar);
    this.bar.add(rightCollar);

    // Initial bar position on floor
    this.bar.position.y = SHAFT_DIA / 2;
    this.bar.rotation.x = 0;
  }

  createFloor() {
    const floorGeo = new THREE.PlaneGeometry(10, 10, 10, 10);
    const floorBump = createFloorBumpMap();
    const floorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0B0B0B,
      roughness: 0.9,
      bumpMap: floorBump,
      bumpScale: 0.005
    });
    this.floor = new THREE.Mesh(floorGeo, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
  }

  createChalk() {
    const count = this.isMobile ? 250 : 600;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      // Random position in a box above the bar
      positions[i * 3] = (Math.random() - 0.5) * 3;
      positions[i * 3 + 1] = Math.random() * 2 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
      sizes[i] = Math.random() * 0.02 + 0.005;
      opacities[i] = Math.random() * 0.2 + 0.15;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.0005,
        -Math.random() * 0.0002 - 0.0001,
        (Math.random() - 0.5) * 0.0003
      ));
    }

    const chalkGeo = new THREE.BufferGeometry();
    chalkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    chalkGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    chalkGeo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    const chalkSprite = createChalkSprite();
    const chalkTex = new THREE.CanvasTexture(chalkSprite);
    chalkTex.colorSpace = THREE.SRGBColorSpace;

    const chalkMat = new THREE.PointsMaterial({
      size: 0.02,
      map: chalkTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false,
      sizeAttenuation: true
    });

    this.chalkParticles = new THREE.Points(chalkGeo, chalkMat);
    this.chalkVelocities = velocities;
    this.scene.add(this.chalkParticles);
  }

  initPostProcessing() {
    // No post-processing for performance, rely on CSS film grain + vignette
  }

  setupResize() {
    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.isMobile = this.width < 768;
    this.pixelRatio = Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 1.75);

    if (this.renderer) {
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(this.pixelRatio);
      if (this.spotLight) {
        this.spotLight.shadow.mapSize.width = this.isMobile ? 1024 : 2048;
        this.spotLight.shadow.mapSize.height = this.isMobile ? 1024 : 2048;
      }
    }
    if (this.camera) {
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    }
  }

  // Preloader animation: reveal plates at 40/60/80/100 KG
  setLoadProgress(kg) {
    this.loadProgress = Math.max(0, Math.min(100, kg));
    const thresholds = [40, 60, 80, 100];

    thresholds.forEach((threshold, i) => {
      if (this.loadProgress >= threshold && this.plates[i] && !this.plates[i].visible) {
        this.revealPlate(i);
      }
    });

    if (this.loadProgress >= 100) {
      this.revealCollars();
    }
  }

  revealPlate(index) {
    const plate = this.plates[index];
    if (!plate) return;

    plate.visible = true;
    plate.scale.set(0.01, 0.01, 0.01);

    // Bounce animation using GSAP (will be imported in intro.js)
    if (window.gsap) {
      gsap.to(plate.scale, {
        x: 1, y: 1, z: 1,
        duration: 0.12,
        ease: 'back.out(3)',
        delay: index * 0.02
      });
    } else {
      plate.scale.set(1, 1, 1);
    }
  }

  revealCollars() {
    this.collars.forEach((collar, i) => {
      if (!collar.visible) {
        collar.visible = true;
        collar.scale.set(0.01, 0.01, 0.01);
        if (window.gsap) {
          gsap.to(collar.scale, {
            x: 1, y: 1, z: 1,
            duration: 0.1,
            ease: 'back.out(2)',
            delay: 0.12 + i * 0.02
          });
        } else {
          collar.scale.set(1, 1, 1);
        }
      }
    });
  }

  // Camera breathe animation (idle)
  updateIdle(time) {
    if (!this.gateVisible) return;

    const orbitAngle = Math.sin(time * 0.125) * 0.052; // ±3 degrees over 8s
    const height = 0.6 + Math.sin(time * 0.2) * 0.05;

    this.camera.position.x = Math.sin(orbitAngle) * 2.2;
    this.camera.position.z = Math.cos(orbitAngle) * 2.2;
    this.camera.position.y = height;
    this.camera.lookAt(0, 0.1, 0);

    // Chalk drift
    if (this.chalkParticles && this.chalkVelocities) {
      const posAttr = this.chalkParticles.geometry.attributes.position;
      const positions = posAttr.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3] += this.chalkVelocities[i].x;
        positions[i * 3 + 1] += this.chalkVelocities[i].y;
        positions[i * 3 + 2] += this.chalkVelocities[i].z;

        // Respawn if too low or too far
        if (positions[i * 3 + 1] < 0.1 || Math.abs(positions[i * 3]) > 2 || Math.abs(positions[i * 3 + 2]) > 1.5) {
          positions[i * 3] = (Math.random() - 0.5) * 3;
          positions[i * 3 + 1] = Math.random() * 2 + 1.5;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Chalk burst at lift (triggered from timeline)
    if (this.chalkBurstTime && time > this.chalkBurstTime && !this.chalkBurstDone) {
      this.triggerChalkBurst();
      this.chalkBurstDone = true;
    }
  }

  triggerChalkBurst() {
    if (!this.chalkParticles || !this.chalkVelocities) return;
    const posAttr = this.chalkParticles.geometry.attributes.position;
    const positions = posAttr.array;
    for (let i = 0; i < positions.length / 3; i++) {
      if (Math.random() < 0.3) {
        positions[i * 3] = (Math.random() - 0.5) * 1.5;
        positions[i * 3 + 1] = 0.15;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
        this.chalkVelocities[i].set(
          (Math.random() - 0.5) * 0.02,
          Math.random() * 0.01 + 0.005,
          (Math.random() - 0.5) * 0.02
        );
      }
    }
    posAttr.needsUpdate = true;
  }

  // Build camera and look-at paths for scroll story
  buildScrollPaths() {
    // CatmullRom curve for camera
    const cameraPoints = [
      new THREE.Vector3(0, 0.6, 2.2),      // p=0: gate view
      new THREE.Vector3(0.8, 0.08, 1.2),   // p=0.25: floor level at plate face
      new THREE.Vector3(0, 0.3, 1.5),      // p=0.55: lifting
      new THREE.Vector3(1.2, 0.9, 1.8),    // p=0.85: hero 3/4 angle
      new THREE.Vector3(0, 0.05, 0.02)     // p=1.0: through plate hole
    ];
    this.cameraPath = new THREE.CatmullRomCurve3(cameraPoints);
    this.cameraPath.closed = false;

    // Look-at points
    const lookPoints = [
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(-0.5, 0.05, 0),    // look at plate face
      new THREE.Vector3(0, 0.4, 0),        // look at bar lifting
      new THREE.Vector3(0, 0.8, 0),        // look at hip height
      new THREE.Vector3(0, 0.05, 0)        // look at hole center
    ];
    this.lookAtPath = new THREE.CatmullRomCurve3(lookPoints);
    this.lookAtPath.closed = false;
  }

  // Update scroll progress (0 to 1)
  setStoryProgress(p) {
    this.storyProgress = Math.max(0, Math.min(1, p));

    if (!this.cameraPath || !this.lookAtPath) {
      this.buildScrollPaths();
    }

    const camPos = this.cameraPath.getPoint(this.storyProgress);
    const lookPos = this.lookAtPath.getPoint(this.storyProgress);

    this.camera.position.copy(camPos);
    this.camera.lookAt(lookPos);

    // Bar animation during scroll
    this.updateBarForProgress(this.storyProgress);

    // Chalk burst at lift start (p ~ 0.25-0.3)
    if (this.storyProgress > 0.25 && this.storyProgress < 0.3 && !this.chalkBurstTime) {
      this.chalkBurstTime = performance.now() / 1000 + 0.1;
      this.chalkBurstDone = false;
    }

    // Plate rotation during lift
    if (this.storyProgress > 0.25 && this.storyProgress < 0.85) {
      const liftProgress = (this.storyProgress - 0.25) / 0.6;
      this.bar.position.y = 0.014 + liftProgress * 0.55; // shaft radius + 0.55m lift
      this.bar.rotation.z = Math.sin(liftProgress * Math.PI) * 0.017; // 1 degree tilt
    }

    // Rim light sweep at p 0.55-0.85
    if (this.rimLight && this.storyProgress > 0.55 && this.storyProgress < 0.85) {
      const sweepProgress = (this.storyProgress - 0.55) / 0.3;
      this.rimLight.position.x = Math.sin(sweepProgress * Math.PI * 2) * 2;
    }
  }

  updateBarForProgress(p) {
    // Plate face DRYV emboss should fill frame at p=0.25
    // Handled by camera path
  }

  render() {
    if (this.renderer && this.scene && this.camera && !this.fallbackMode) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Fallback mode: no WebGL, reduced motion, or low memory
  initFallback() {
    // Fallback is handled in intro.js with poster stills
    return Promise.resolve();
  }

  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.scene) {
      this.scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this.scene = null;
    }
    this.camera = null;
  }
}

// Export for module and global
if (typeof module !== 'undefined') module.exports = { DRYVScene };
window.DRYVScene = DRYVScene;