import * as THREE from 'three';
import { SkinInstance } from '../game-engine/components';
import globals from '../game-engine/globals';
import { Component, FiniteStateMachine } from '../game-engine/utils';

export class Player extends Component {
  constructor(gameObject) {
    super(gameObject);
    const { inputManager, models, moveSpeed } = globals;
    const model = models.knight;
    this.skinInstance = gameObject.addComponent(SkinInstance, model);
    this.turnSpeed = moveSpeed / 4;

    this.offscreenTimer = 0;
    this.maxTimeOffScreen = 3;
    globals.playerRadius = model.size / 2;

    // status
    this.acceleration = moveSpeed / 100;
    this.runningSpeed = moveSpeed;
    this.maxSpeed = moveSpeed * 2;
    this.impulseForce = 2;
    this.jumpAcceleration = moveSpeed / 200;
    this.isMoving = false;
    this.isInAir = false;
    this.isAirJump = false;

    const isMoving = () => inputManager.keys.up.down
      || inputManager.keys.down.down
      || inputManager.keys.left.down
      || inputManager.keys.right.down;
    // finist state machine
    this.fsm = new FiniteStateMachine({
      idle: {
        enter: () => {
          this.skinInstance.setAnimation('Idle');
          this.speed = 0;
        },
        update: () => {
          if (isMoving()) {
            this.fsm.transition('walk');
          }
        },
      },
      walk: {
        enter: () => {
          this.skinInstance.setAnimation('Walking');
          this.speed = this.acceleration;
        },
        update: () => {
          if (isMoving()) {
            this.speed += this.acceleration;
            if (this.speed >= this.runningSpeed) {
              this.fsm.transition('run');
            }
          }
          else {
            this.fsm.transition('idle');
          }
        },
      },
      run: {
        enter: () => {
          this.skinInstance.setAnimation('Run');
        },
        update: () => {
          if (isMoving()) {
            if (this.speed < this.maxSpeed) {
              this.speed += this.acceleration;
            }
          }
          else {
            this.fsm.transition('idle');
          }
        },
      },
      jump: {
        enter: () => {
          this.skinInstance.setAnimation('Jump');
          this.jumpAcceleration = this.impulseForce;
          this.isInAir = true;
          this.isAirJump = false;
        },
        update: () => {
          if (!this.isAirJump && inputManager.keys.space.justPressed) {
            this.jumpAcceleration = this.impulseForce;
            this.isAirJump = true;
          }
          if (isMoving()) {
            if (this.speed < this.maxSpeed) {
              this.speed += this.acceleration;
            }
          }
          else {
            this.speed = 0;
          }

          const { position } = this.gameObject.transform;
          if (position.y >= 0) {
            this.jumpAcceleration -= this.acceleration;
            position.y += this.jumpAcceleration;
          }
          else {
            position.y = 0;
            this.isInAir = false;
            if (this.speed === 0) {
              this.fsm.transition('idle');
            }
            else if (this.speed > this.runningSpeed) {
              this.fsm.transition('run');
            }
            else {
              this.fsm.transition('walk');
            }
          }
        },
      },
    }, 'idle');
  }

  update() {
    this.fsm.update();
    const { deltaTime, inputManager, camera } = globals;
    const { transform } = this.gameObject;
    const vector = new THREE.Vector3();
    camera.getWorldDirection(vector);
    const theta = Math.atan2(vector.x, vector.z);

    if (inputManager.keys.up.down) {
      if (inputManager.keys.left.down) {
        transform.quaternion.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          theta + (Math.PI / 4),
        );
      }
      else if (inputManager.keys.right.down) {
        transform.quaternion.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          theta - (Math.PI / 4),
        );
      }
      else {
        transform.quaternion.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          theta,
        );
      }
    }
    else if (inputManager.keys.down.down) {
      if (inputManager.keys.left.down) {
        transform.quaternion.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          theta + ((Math.PI / 4) * 3),
        );
      }
      else if (inputManager.keys.right.down) {
        transform.quaternion.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          theta - ((Math.PI / 4) * 3),
        );
      }
      else {
        transform.quaternion.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          theta + Math.PI,
        );
      }
    }
    else {
      if (inputManager.keys.left.down) {
        if (inputManager.keys.left.justPressed
          || inputManager.keys.up.justReleased
          || inputManager.keys.down.justReleased) {
          transform.quaternion.setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            theta + (Math.PI / 2),
          );
        }
        else {
          camera.distance = 40;
          const diametre = (camera.distance * 2);
          const step = (Math.PI * diametre) / (this.speed * deltaTime);
          transform.rotateOnAxis(
            new THREE.Vector3(0, 1, 0),
            ((2 * Math.PI) / step),
          );
        }
      }
      if (inputManager.keys.right.down) {
        if (inputManager.keys.right.justPressed
          || inputManager.keys.up.justReleased
          || inputManager.keys.down.justReleased) {
          transform.quaternion.setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            theta - (Math.PI / 2),
          );
        }
        else {
          camera.distance = 40;
          const diametre = (camera.distance * 2);
          const step = (Math.PI * diametre) / (this.speed * deltaTime);
          // transform.rotation.y -= ((2 * Math.PI) / step);
          transform.rotateOnAxis(
            new THREE.Vector3(0, 1, 0),
            -((2 * Math.PI) / step),
          );
        }
      }
    }

    transform.translateOnAxis(globals.kForward, this.speed * deltaTime);

    if (!this.isInAir && inputManager.keys.space.down) {
      this.fsm.transition('jump');
    }
  }
}
