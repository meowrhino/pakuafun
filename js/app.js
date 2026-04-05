// ============================================================
// app.js — Entrada principal: escena Three.js, loop, estados
// ============================================================
import * as THREE from 'three';
import { XIANTIAN_ORDER, HOUTIAN_ORDER } from './data.js';
import { OctagonalPrism } from './prism.js';
import { TouchHandler } from './touch.js';
import { initHexagramDisplay, updateHexagram, showPanel, hidePanel } from './hexagram.js';

// ---- State ----
let state = 'EXPLORE';

// ---- Responsive ----
const isMobile = window.innerWidth < 768;

// Camera stays roughly the same angle — we move the DEVICE up/down
const CAM_POS = new THREE.Vector3(0, 0.5, isMobile ? 7.0 : 5.0);
const LOOK_AT = new THREE.Vector3(0, 0, 0);

// Device Y position targets
const DEVICE_Y_EXPLORE = 0;
const DEVICE_Y_DETAIL = isMobile ? 2.5 : 2.0;

let deviceTargetY = DEVICE_Y_EXPLORE;
let cameraTarget = CAM_POS.clone();
let currentLook = LOOK_AT.clone();
let lookTarget = LOOK_AT.clone();

// ---- Scene setup ----
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.copy(CAM_POS);

// ---- Build prisms ----
let upperPrism, lowerPrism, deviceGroup;

async function init() {
  await document.fonts.ready;

  upperPrism = new OctagonalPrism(XIANTIAN_ORDER, {
    radius: 1.0, height: 0.9, label: '先天'
  });
  lowerPrism = new OctagonalPrism(HOUTIAN_ORDER, {
    radius: 1.0, height: 0.9, label: '後天'
  });

  upperPrism.group.position.y = 0.55;
  lowerPrism.group.position.y = -0.55;

  deviceGroup = new THREE.Group();
  deviceGroup.add(upperPrism.group);
  deviceGroup.add(lowerPrism.group);

  // Slight tilt for 3D depth
  deviceGroup.rotation.x = 0.12;

  scene.add(deviceGroup);

  // ---- Hexagram display ----
  initHexagramDisplay();
  refreshHexagram();

  // ---- Touch ----
  new TouchHandler(renderer.domElement, upperPrism, lowerPrism, {
    onSnap: () => setTimeout(refreshHexagram, 50),
    onTap: toggleState,
    getState: () => state,
    getDeviceGroup: () => deviceGroup,
  });

  // ---- Stars background ----
  drawStars();

  // ---- Hide loading ----
  const loading = document.getElementById('loading');
  loading.classList.add('hidden');
  setTimeout(() => loading.remove(), 600);

  animate();
}

function drawStars() {
  const canvas = document.getElementById('stars');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = Math.random() * 1.2 + 0.3;
    const alpha = Math.random() * 0.6 + 0.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
    ctx.fill();
  }
}

function refreshHexagram() {
  const upperKey = upperPrism.getFrontTrigramKey();
  const lowerKey = lowerPrism.getFrontTrigramKey();
  updateHexagram(upperKey, lowerKey);
}

// Tilt threshold: if tilted beyond this, zoom into cap instead of showing hexagram
const TILT_CAP_THRESHOLD = 0.6;

function toggleState() {
  if (state === 'EXPLORE') {
    const tilt = deviceGroup ? deviceGroup.rotation.x : 0;

    if (tilt > TILT_CAP_THRESHOLD) {
      // Looking at top cap → zoom in to see Xiantian bagua
      state = 'CAP_VIEW';
      cameraTarget.set(0, 3.5, 2.0);
      lookTarget.set(0, 0.5, 0);
      document.getElementById('tap-hint')?.classList.add('hidden');
    } else if (tilt < -TILT_CAP_THRESHOLD) {
      // Looking at bottom cap → zoom in to see Houtian bagua
      state = 'CAP_VIEW';
      cameraTarget.set(0, -2.5, 2.0);
      lookTarget.set(0, -0.5, 0);
      document.getElementById('tap-hint')?.classList.add('hidden');
    } else {
      // Normal → show hexagram
      state = 'DETAIL';
      deviceTargetY = DEVICE_Y_DETAIL;
      lookTarget.set(0, DEVICE_Y_DETAIL * 0.5, 0);
      showPanel();
      document.getElementById('tap-hint')?.classList.add('hidden');
    }
  } else {
    state = 'EXPLORE';
    deviceTargetY = DEVICE_Y_EXPLORE;
    cameraTarget.copy(CAM_POS);
    lookTarget.set(0, 0, 0);
    hidePanel();
  }
}

// ---- Animation loop ----
function animate() {
  requestAnimationFrame(animate);

  // Move device group up/down smoothly
  if (deviceGroup) {
    deviceGroup.position.y += (deviceTargetY - deviceGroup.position.y) * 0.08;
  }

  // Smooth camera position and lookAt
  camera.position.lerp(cameraTarget, 0.06);
  currentLook.lerp(lookTarget, 0.06);
  camera.lookAt(currentLook);

  // Prism snap animation
  upperPrism.update();
  lowerPrism.update();

  if (upperPrism.isSnapping || lowerPrism.isSnapping) {
    refreshHexagram();
  }

  renderer.render(scene, camera);
}


// ---- Resize ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Go ----
init();
