// ============================================================
// app.js — Entrada principal: escena Three.js, loop, estados
// ============================================================
import * as THREE from 'three';
import { XIANTIAN_ORDER, HOUTIAN_ORDER } from './data.js';
import { OctagonalPrism } from './prism.js';
import { TouchHandler } from './touch.js';
import { initHexagramDisplay, updateHexagram, showPanel, hidePanel } from './hexagram.js';

// ---- State ----
let state = 'EXPLORE'; // 'EXPLORE' | 'DETAIL'

// ---- Camera targets ----
const CAM_EXPLORE = new THREE.Vector3(0, 0.3, 5.5);
const CAM_DETAIL = new THREE.Vector3(0, 1.8, 4.5);
const LOOK_EXPLORE = new THREE.Vector3(0, 0, 0);
const LOOK_DETAIL = new THREE.Vector3(0, 0.6, 0);

let cameraTarget = CAM_EXPLORE.clone();
let lookTarget = LOOK_EXPLORE.clone();
let currentLook = LOOK_EXPLORE.clone();

// ---- Scene setup ----
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.8;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.copy(CAM_EXPLORE);

// ---- Lighting ----
scene.add(new THREE.AmbientLight(0xffffff, 2.0));

// Key light from front-above
const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
keyLight.position.set(0, 2, 6);
scene.add(keyLight);

// Fill from left
const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
fillLight.position.set(-4, 0, 3);
scene.add(fillLight);

// Warm rim from below
const rimLight = new THREE.DirectionalLight(0xd4af37, 0.5);
rimLight.position.set(0, -3, 2);
scene.add(rimLight);

// ---- Build prisms ----
let upperPrism, lowerPrism, deviceGroup;

async function init() {
  // Wait for Chinese font
  await document.fonts.ready;

  upperPrism = new OctagonalPrism(XIANTIAN_ORDER, { radius: 1.0, height: 1.0 });
  lowerPrism = new OctagonalPrism(HOUTIAN_ORDER, { radius: 1.0, height: 1.0 });

  upperPrism.group.position.y = 0.6;
  lowerPrism.group.position.y = -0.6;

  deviceGroup = new THREE.Group();
  deviceGroup.add(upperPrism.group);
  deviceGroup.add(lowerPrism.group);

  // Slight tilt for visual interest
  deviceGroup.rotation.x = 0.08;

  scene.add(deviceGroup);

  // ---- Hexagram display ----
  initHexagramDisplay();
  refreshHexagram();

  // ---- Touch ----
  new TouchHandler(renderer.domElement, upperPrism, lowerPrism, {
    onSnap: () => {
      // Wait a tick for snap to settle, then refresh
      setTimeout(refreshHexagram, 50);
    },
    onTap: toggleState,
  });

  // ---- Hide loading ----
  const loading = document.getElementById('loading');
  loading.classList.add('hidden');
  setTimeout(() => loading.remove(), 600);

  // ---- Start loop ----
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
    cameraTarget.copy(CAM_DETAIL);
    lookTarget.copy(LOOK_DETAIL);
    showPanel();
    document.getElementById('tap-hint')?.classList.add('hidden');
  } else {
    state = 'EXPLORE';
    cameraTarget.copy(CAM_EXPLORE);
    lookTarget.copy(LOOK_EXPLORE);
    hidePanel();
  }
}

// ---- Animation loop ----
let idleAngle = 0;

function animate() {
  requestAnimationFrame(animate);

  // Smooth camera movement
  camera.position.lerp(cameraTarget, 0.06);
  currentLook.lerp(lookTarget, 0.06);
  camera.lookAt(currentLook);

  // Update prism snapping
  upperPrism.update();
  lowerPrism.update();

  // Continuously refresh hexagram during snapping
  if (upperPrism.isSnapping || lowerPrism.isSnapping) {
    refreshHexagram();
  }

  // Idle rotation in EXPLORE mode (very subtle)
  if (state === 'EXPLORE' && deviceGroup) {
    idleAngle += 0.003;
    deviceGroup.rotation.y = Math.sin(idleAngle) * 0.15;
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
