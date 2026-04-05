// ============================================================
// prism.js — Clase OctagonalPrism: 8 planos individuales + caps
// ============================================================
import * as THREE from 'three';
import { TRIGRAMS } from './data.js';
import { createTrigramTexture, createCapTexture } from './trigrams.js';

const NUM_SIDES = 8;
const FACE_ANGLE = (Math.PI * 2) / NUM_SIDES; // 45°
const SNAP_EASING = 0.1;
const SNAP_THRESHOLD = 0.001;

export class OctagonalPrism {
  constructor(trigramOrder, { radius = 1.0, height = 1.0 } = {}) {
    this.trigramOrder = trigramOrder;
    this.trigrams = trigramOrder.map(key => TRIGRAMS[key]);
    this.radius = radius;
    this.height = height;

    this.currentFaceIndex = 0;
    this.targetRotationY = 0;
    this.actualRotationY = 0;
    this.isSnapping = false;

    // This group rotates
    this.group = new THREE.Group();
    // Inner group holds all face meshes
    this.innerGroup = new THREE.Group();
    this.group.add(this.innerGroup);

    this.textures = [];
    this.highlightTextures = [];
    this.materials = [];
    this.faceMeshes = [];

    this._buildMesh();
  }

  _buildMesh() {
    // Generate textures
    for (const trigram of this.trigrams) {
      this.textures.push(createTrigramTexture(trigram, false));
      this.highlightTextures.push(createTrigramTexture(trigram, true));
    }

    // Calculate face width (chord length of octagon)
    const faceWidth = 2 * this.radius * Math.sin(FACE_ANGLE / 2);
    // Apothem = distance from center to middle of a face
    const apothem = this.radius * Math.cos(FACE_ANGLE / 2);

    // Create 8 individual planes, one per face
    for (let i = 0; i < NUM_SIDES; i++) {
      const planeGeom = new THREE.PlaneGeometry(faceWidth, this.height);
      const mat = new THREE.MeshStandardMaterial({
        map: this.textures[i],
        roughness: 0.4,
        metalness: 0.05,
        emissive: new THREE.Color(0x000000),
      });

      this.materials.push(mat);

      const mesh = new THREE.Mesh(planeGeom, mat);

      // Position and rotate each face around the Y axis
      const angle = i * FACE_ANGLE;
      mesh.position.x = Math.sin(angle) * apothem;
      mesh.position.z = Math.cos(angle) * apothem;
      mesh.rotation.y = angle;

      this.faceMeshes.push(mesh);
      this.innerGroup.add(mesh);
    }

    // Top and bottom caps (octagonal)
    const capTexture = createCapTexture();
    const capShape = new THREE.Shape();
    for (let i = 0; i < NUM_SIDES; i++) {
      const angle = i * FACE_ANGLE + FACE_ANGLE / 2;
      const x = Math.sin(angle) * this.radius;
      const z = Math.cos(angle) * this.radius;
      if (i === 0) capShape.moveTo(x, z);
      else capShape.lineTo(x, z);
    }
    capShape.closePath();

    const capGeom = new THREE.ShapeGeometry(capShape);
    const topCap = new THREE.Mesh(capGeom, new THREE.MeshStandardMaterial({
      map: capTexture, roughness: 0.5, metalness: 0.05
    }));
    topCap.rotation.x = -Math.PI / 2;
    topCap.position.y = this.height / 2;
    this.innerGroup.add(topCap);

    const bottomCap = new THREE.Mesh(capGeom.clone(), new THREE.MeshStandardMaterial({
      map: capTexture, roughness: 0.5, metalness: 0.05
    }));
    bottomCap.rotation.x = Math.PI / 2;
    bottomCap.position.y = -this.height / 2;
    this.innerGroup.add(bottomCap);

    this._updateHighlight();
  }

  addRotation(deltaRadians) {
    this.actualRotationY += deltaRadians;
    this.innerGroup.rotation.y = this.actualRotationY;
    this._updateFaceFromRotation();
  }

  snapToNearest() {
    const normalised = ((this.actualRotationY % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const nearestIndex = Math.round(normalised / FACE_ANGLE) % NUM_SIDES;
    this.currentFaceIndex = nearestIndex;
    this.targetRotationY = nearestIndex * FACE_ANGLE;

    // Shortest path wrap
    const diff = this.targetRotationY - this.actualRotationY;
    const wrapped = ((diff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    this.targetRotationY = this.actualRotationY + wrapped;

    this.isSnapping = true;
  }

  update() {
    if (this.isSnapping) {
      const diff = this.targetRotationY - this.actualRotationY;
      if (Math.abs(diff) < SNAP_THRESHOLD) {
        this.actualRotationY = this.targetRotationY;
        this.isSnapping = false;
      } else {
        this.actualRotationY += diff * SNAP_EASING;
      }
      this.innerGroup.rotation.y = this.actualRotationY;
      this._updateHighlight();
    }
  }

  _updateFaceFromRotation() {
    const normalised = ((this.actualRotationY % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    this.currentFaceIndex = Math.round(normalised / FACE_ANGLE) % NUM_SIDES;
    this._updateHighlight();
  }

  _updateHighlight() {
    for (let i = 0; i < NUM_SIDES; i++) {
      const mat = this.materials[i];
      if (i === this.currentFaceIndex) {
        mat.map = this.highlightTextures[i];
        mat.emissive.setHex(0x1a1400);
      } else {
        mat.map = this.textures[i];
        mat.emissive.setHex(0x000000);
      }
      mat.needsUpdate = true;
    }
  }

  getFrontTrigramKey() {
    return this.trigramOrder[this.currentFaceIndex];
  }

  getFrontTrigram() {
    return TRIGRAMS[this.getFrontTrigramKey()];
  }
}
