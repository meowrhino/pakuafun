// ============================================================
// trigrams.js — Canvas2D → CanvasTexture para caras del prisma
// ============================================================
import * as THREE from 'three';

const SIZE = 512;
const BG_COLOR = '#12132d';
const BG_HIGHLIGHT = '#1c1e48';
const LINE_COLOR = '#e8c547';
const TEXT_COLOR = '#e8c547';
const TEXT_MUTED = '#a09882';

export function createTrigramTexture(trigram, highlighted = false) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = highlighted ? BG_HIGHLIGHT : BG_COLOR;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Border
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 2;
  ctx.globalAlpha = highlighted ? 0.6 : 0.15;
  ctx.strokeRect(8, 8, SIZE - 16, SIZE - 16);
  ctx.globalAlpha = 1;

  // Trigram lines (3 lines, drawn top-to-bottom = top line first)
  const lineWidth = 260;
  const lineHeight = 28;
  const gapWidth = 44;
  const startY = 140;
  const lineSpacing = 58;
  const x = (SIZE - lineWidth) / 2;

  ctx.fillStyle = LINE_COLOR;

  // lines array is [bottom, middle, top] so we reverse for drawing top-to-bottom
  const reversed = [...trigram.lines].reverse();
  reversed.forEach((line, i) => {
    const y = startY + i * lineSpacing;
    if (line === 1) {
      // Yang — solid line
      roundRect(ctx, x, y, lineWidth, lineHeight, 4);
    } else {
      // Yin — broken line
      const segWidth = (lineWidth - gapWidth) / 2;
      roundRect(ctx, x, y, segWidth, lineHeight, 4);
      roundRect(ctx, x + segWidth + gapWidth, y, segWidth, lineHeight, 4);
    }
  });

  // Chinese character
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = '700 56px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(trigram.chinese, SIZE / 2, 360);

  // English name
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '24px "Noto Serif SC", Georgia, serif';
  ctx.fillText(trigram.english, SIZE / 2, 420);

  // Element
  ctx.font = '18px "Noto Serif SC", Georgia, serif';
  ctx.globalAlpha = 0.5;
  ctx.fillText(trigram.element, SIZE / 2, 460);
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Top/bottom cap texture (simple dark with subtle pattern)
export function createCapTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle taiji hint (circle)
  ctx.strokeStyle = LINE_COLOR;
  ctx.globalAlpha = 0.1;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(128, 128, 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}
