import * as THREE from 'three';
import globals from '../game-engine/globals';
import {
  Component,
} from '../game-engine/utils';

export class Player extends Component {
  constructor(gameObject) {
    super(gameObject);
    const geometry = new THREE.BoxBufferGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshNormalMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    gameObject.transform.add(mesh);
    this.speed = 0.0;
    this.velocity = 0.0;
  }

  update() {
    const { inputManager } = globals;

    if (inputManager.keys.up.down) {
      this.speed = 0.01;
    }
    else if (inputManager.keys.down.down) {
      this.gameObject.transform.rotateY(0.5);
    }
    if (inputManager.keys.right.down) {
      this.gameObject.transform.rotateY(0.05);
    }
    else if (inputManager.keys.left.down) {
      this.gameObject.transform.rotateY(-0.05);
    }

    this.velocity += (this.speed - this.velocity) * 0.3;
    this.gameObject.transform.translateZ(this.velocity);
  }
}
