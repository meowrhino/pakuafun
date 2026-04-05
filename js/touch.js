// ============================================================
// touch.js — Pointer events para rotación independiente
// ============================================================

const SENSITIVITY = 0.008;
const TAP_THRESHOLD = 8; // px max para considerar tap

export class TouchHandler {
  constructor(canvas, upperPrism, lowerPrism, { onSnap, onTap }) {
    this.canvas = canvas;
    this.upperPrism = upperPrism;
    this.lowerPrism = lowerPrism;
    this.onSnap = onSnap;
    this.onTap = onTap;

    this.active = false;
    this.activePrism = null;
    this.startX = 0;
    this.startY = 0;
    this.totalDrag = 0;

    canvas.addEventListener('pointerdown', this._onDown.bind(this));
    canvas.addEventListener('pointermove', this._onMove.bind(this));
    canvas.addEventListener('pointerup', this._onUp.bind(this));
    canvas.addEventListener('pointercancel', this._onUp.bind(this));
  }

  _onDown(e) {
    this.active = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.totalDrag = 0;

    // Determine which prism: upper half of canvas → upper prism
    const rect = this.canvas.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height;
    this.activePrism = relY < 0.5 ? this.upperPrism : this.lowerPrism;

    this.canvas.setPointerCapture(e.pointerId);
  }

  _onMove(e) {
    if (!this.active || !this.activePrism) return;

    const deltaX = e.clientX - this.startX;
    this.totalDrag += Math.abs(e.clientX - this.startX) + Math.abs(e.clientY - this.startY);

    const deltaRadians = (e.clientX - this.startX) * SENSITIVITY;
    this.activePrism.addRotation(deltaRadians);

    this.startX = e.clientX;
    this.startY = e.clientY;
  }

  _onUp(e) {
    if (!this.active) return;
    this.active = false;

    if (this.totalDrag < TAP_THRESHOLD) {
      this.onTap?.();
    } else if (this.activePrism) {
      this.activePrism.snapToNearest();
      this.onSnap?.();
    }

    this.activePrism = null;
  }
}
