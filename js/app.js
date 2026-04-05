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

  // ---- Background ----
  drawBackground();

  // ---- Hide loading ----
  const loading = document.getElementById('loading');
  loading.classList.add('hidden');
  setTimeout(() => loading.remove(), 600);

  animate();
}

function drawBackground() {
  const canvas = document.getElementById('stars');
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Shanshui mountains (ink wash style)
  drawMountainLayer(ctx, W, H, H * 0.72, H * 0.22, 'rgba(18, 22, 50, 0.7)', 5);
  drawMountainLayer(ctx, W, H, H * 0.78, H * 0.15, 'rgba(14, 17, 42, 0.6)', 4);
  drawMountainLayer(ctx, W, H, H * 0.85, H * 0.10, 'rgba(11, 14, 35, 0.5)', 3);

  // Subtle mist between layers
  const mist = ctx.createLinearGradient(0, H * 0.7, 0, H * 0.9);
  mist.addColorStop(0, 'rgba(20, 22, 56, 0)');
  mist.addColorStop(0.5, 'rgba(20, 22, 56, 0.15)');
  mist.addColorStop(1, 'rgba(20, 22, 56, 0)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, H * 0.7, W, H * 0.2);

  // Stars (sparse, golden)
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H * 0.75; // only above mountains
    const r = Math.random() * 1.0 + 0.2;
    const alpha = Math.random() * 0.5 + 0.1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
    ctx.fill();
  }

  // Moon hint (very subtle circle)
  ctx.beginPath();
  ctx.arc(W * 0.8, H * 0.15, 30, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(212, 175, 55, 0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawMountainLayer(ctx, W, H, baseY, maxHeight, color, peaks) {
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, baseY);

  const step = W / (peaks * 20);
  for (let x = 0; x <= W; x += step) {
    const progress = x / W;
    // Multiple sine waves for organic mountain shapes
    const y = baseY
      - Math.sin(progress * Math.PI * peaks) * maxHeight * 0.6
      - Math.sin(progress * Math.PI * peaks * 2.3 + 1) * maxHeight * 0.25
      - Math.sin(progress * Math.PI * peaks * 0.7 + 2) * maxHeight * 0.15;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function refreshHexagram() {
  const upperKey = upperPrism.getFrontTrigramKey();
  const lowerKey = lowerPrism.getFrontTrigramKey();
  updateHexagram(upperKey, lowerKey);
}

const TILT_CAP_THRESHOLD = 0.6;
const DEFAULT_TILT = 0.12;
let targetTiltX = DEFAULT_TILT;

function toggleState() {
  if (state === 'EXPLORE') {
    const tilt = deviceGroup ? deviceGroup.rotation.x : 0;

    if (tilt > TILT_CAP_THRESHOLD) {
      // Looking at top → zoom to top bagua cap
      state = 'CAP_VIEW';
      cameraTarget.set(0, 3.0, 1.5);
      lookTarget.set(0, 0.5, 0);
      document.getElementById('tap-hint')?.classList.add('hidden');
    } else if (tilt < -TILT_CAP_THRESHOLD) {
      // Looking at bottom → zoom to bottom bagua cap
      state = 'CAP_VIEW';
      cameraTarget.set(0, -2.0, 1.5);
      lookTarget.set(0, -0.5, 0);
      document.getElementById('tap-hint')?.classList.add('hidden');
    } else {
      // Normal tap → show hexagram result
      state = 'DETAIL';
      deviceTargetY = DEVICE_Y_DETAIL;
      targetTiltX = DEFAULT_TILT; // reset tilt to neutral
      lookTarget.set(0, DEVICE_Y_DETAIL * 0.5, 0);
      showPanel();
      document.getElementById('tap-hint')?.classList.add('hidden');
    }
  } else {
    state = 'EXPLORE';
    deviceTargetY = DEVICE_Y_EXPLORE;
    targetTiltX = DEFAULT_TILT;
    cameraTarget.copy(CAM_POS);
    lookTarget.set(0, 0, 0);
    hidePanel();
  }
}

// ---- Animation loop ----
function animate() {
  requestAnimationFrame(animate);

  // Move device group smoothly
  if (deviceGroup) {
    deviceGroup.position.y += (deviceTargetY - deviceGroup.position.y) * 0.08;
    // Smooth tilt reset (only in DETAIL/returning to EXPLORE)
    if (state !== 'EXPLORE') {
      deviceGroup.rotation.x += (targetTiltX - deviceGroup.rotation.x) * 0.06;
    }
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
