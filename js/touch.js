// ============================================================
// touch.js — Pointer events: rotación horizontal por prisma
//            + rotación vertical del artilugio entero
// ============================================================

const SENSITIVITY_X = 0.008;   // horizontal → rotate prism Y
const SENSITIVITY_Y = 0.004;   // vertical → tilt device X
const TAP_THRESHOLD = 8;
const TILT_MIN = -0.6;  // max tilt looking from below
const TILT_MAX = 0.8;   // max tilt looking from above

export class TouchHandler {
  constructor(canvas, upperPrism, lowerPrism, { onSnap, onTap, getState, getDeviceGroup }) {
    this.canvas = canvas;
    this.upperPrism = upperPrism;
    this.lowerPrism = lowerPrism;
    this.onSnap = onSnap;
    this.onTap = onTap;
    this.getState = getState;
    this.getDeviceGroup = getDeviceGroup;

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

    if (this.getState() === 'EXPLORE') {
      const rect = this.canvas.getBoundingClientRect();
      const relY = (e.clientY - rect.top) / rect.height;
      this.activePrism = relY < 0.5 ? this.upperPrism : this.lowerPrism;
    } else {
      this.activePrism = null;
    }

    this.canvas.setPointerCapture(e.pointerId);
  }

  _onMove(e) {
    if (!this.active) return;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    this.totalDrag += Math.abs(dx) + Math.abs(dy);

    if (this.getState() === 'EXPLORE') {
      // Horizontal drag → rotate active prism
      if (this.activePrism) {
        this.activePrism.addRotation(dx * SENSITIVITY_X);
      }

      // Vertical drag → tilt entire device
      const group = this.getDeviceGroup();
      if (group) {
        group.rotation.x = Math.max(TILT_MIN,
          Math.min(TILT_MAX, group.rotation.x - dy * SENSITIVITY_Y));
      }
    }

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
