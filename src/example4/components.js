import * as THREE from 'three';
import globals from '../game-engine/globals';
import { Component } from '../game-engine/utils';

export class CameraInfo extends Component {
  constructor(gameObject) {
    super(gameObject);
    this.projScreenMatrix = new THREE.Matrix4();
    this.frustum = new THREE.Frustum();

    const { playerObject } = globals;
    this.goal = new THREE.Object3D();
    playerObject.transform.add(this.goal);
    this.goal.position.set(0, 5, -5);
    const goalPos = this.goal.getWorldPosition();
    this.cache = { x: goalPos.x, z: goalPos.z };
  }

  update() {
    const { camera, playerObject } = globals;

    const playerPos = playerObject.transform.position;

    const goalPos = this.goal.getWorldPosition();
    // if (this.cache.x !== goalPos.x || this.cache.z !== goalPos.z) {
    this.cache = { x: goalPos.x, z: goalPos.z };
    const temp = new THREE.Vector3();
    temp.setFromMatrixPosition(this.goal.matrixWorld);
    camera.position.lerp(temp, 0.02);
    // }

    // camera.lookAt(playerPos);
    camera.lookAt(playerPos.x, playerPos.y + 5, playerPos.z);

    this.projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
  }
}
