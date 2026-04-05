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

  // ---- Hide loading ----
  const loading = document.getElementById('loading');
  loading.classList.add('hidden');
  setTimeout(() => loading.remove(), 600);

  animate();
}

function refreshHexagram() {
  const upperKey = upperPrism.getFrontTrigramKey();
  const lowerKey = lowerPrism.getFrontTrigramKey();
  updateHexagram(upperKey, lowerKey);
}

function toggleState() {
  if (state === 'EXPLORE') {
    state = 'DETAIL';
    deviceTargetY = DEVICE_Y_DETAIL;
    lookTarget.set(0, DEVICE_Y_DETAIL * 0.5, 0);
    showPanel();
    document.getElementById('tap-hint')?.classList.add('hidden');
  } else {
    state = 'EXPLORE';
    deviceTargetY = DEVICE_Y_EXPLORE;
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

  // Smooth lookAt follows device
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
