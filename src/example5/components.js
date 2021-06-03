import * as THREE from 'three';
import globals from '../game-engine/globals';
import {
  Component,
} from '../game-engine/utils';

export class CameraInfo extends Component {
  constructor(gameObject) {
    super(gameObject);
    const { camera, playerObject } = globals;

    this.temp = new THREE.Vector3();
    this.dir = new THREE.Vector3();
    this.a = new THREE.Vector3();
    this.b = new THREE.Vector3();
    this.goal = new THREE.Object3D();

    this.coronaSafetyDistance = 0.3;
    this.follow = new THREE.Object3D();
    this.follow.position.z = -this.coronaSafetyDistance;
    playerObject.transform.add(this.follow);

    this.goal.add(camera);
  }

  update() {
    const { playerObject, camera } = globals;

    this.a.lerp(playerObject.transform.position, 0.4);
    this.b.copy(this.goal.position);

    this.dir.copy(this.a).sub(this.b).normalize();
    const dis = this.a.distanceTo(this.b) - this.coronaSafetyDistance;
    this.goal.position.addScaledVector(this.dir, dis);
    this.goal.position.lerp(this.temp, 0.02);
    this.temp.setFromMatrixPosition(this.follow.matrixWorld);

    camera.lookAt(playerObject.transform.position);
  }
}
