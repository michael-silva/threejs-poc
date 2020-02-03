import * as THREE from 'three';
import { GUI } from 'dat.gui';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils';
import globals from './globals';
import {
  FiniteStateMachine, Component, CoroutineRunner, rand,
} from './utils';

export class SkinInstance extends Component {
  constructor(gameObject, model) {
    super(gameObject);
    this.model = model;
    this.animRoot = SkeletonUtils.clone(this.model.gltf.scene);
    this.mixer = new THREE.AnimationMixer(this.animRoot);
    gameObject.transform.add(this.animRoot);
    this.actions = {};
  }

  setAnimation(animName) {
    const clip = this.model.animations[animName];
    // eslint-disable-next-line no-restricted-syntax
    for (const action of Object.values(this.actions)) {
      // turn off all current actions
      action.enabled = false;
    }
    // get or create existing action for clip
    const action = this.mixer.clipAction(clip);
    action.enabled = true;
    action.reset();
    action.play();
    this.actions[animName] = action;
  }

  update() {
    this.mixer.update(globals.deltaTime);
  }
}

const labelContainerElem = document.querySelector('#labels');
function showHideDebugInfo() {
  labelContainerElem.style.display = globals.debug ? '' : 'none';
}

const gui = new GUI();
gui.add(globals, 'debug').onChange(showHideDebugInfo);
showHideDebugInfo();

export class StateDisplayHelper extends Component {
  constructor(gameObject, size) {
    super(gameObject);
    this.elem = document.createElement('div');
    labelContainerElem.appendChild(this.elem);
    this.pos = new THREE.Vector3();

    this.helper = new THREE.PolarGridHelper(size / 2, 1, 1, 16);
    gameObject.transform.add(this.helper);
  }

  setState(s) {
    this.elem.textContent = s;
  }

  setColor(cssColor) {
    this.elem.style.color = cssColor;
    this.helper.material.color.set(cssColor);
  }

  update() {
    const { pos } = this;
    const { transform } = this.gameObject;
    const { canvas } = globals;
    this.helper.visible = globals.debug;
    if (!globals.debug) {
      return;
    }

    pos.copy(transform.position);

    // get the normalized screen coordinate of that position
    // x and y will be in the -1 to +1 range with x = -1 being
    // on the left and y = -1 being on the bottom
    pos.project(globals.camera);

    // convert the normalized position to CSS coordinates
    const x = (pos.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (pos.y * -0.5 + 0.5) * canvas.clientHeight;

    // move the elem to that position
    this.elem.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
  }
}

// Returns true of obj1 and obj2 are close
function isClose(obj1, obj1Radius, obj2, obj2Radius) {
  const minDist = obj1Radius + obj2Radius;
  const dist = obj1.position.distanceTo(obj2.position);
  return dist < minDist;
}

// keeps v between -min and +min
function minMagnitude(v, min) {
  return Math.abs(v) > min
    ? min * Math.sign(v)
    : v;
}

// eslint-disable-next-line func-names
const aimTowardAndGetDistance = (function () {
  const delta = new THREE.Vector3();

  return (source, targetPos, maxTurn) => {
    delta.subVectors(targetPos, source.position);
    // compute the direction we want to be facing
    const targetRot = Math.atan2(delta.x, delta.z) + Math.PI * 1.5;
    // rotate in the shortest direction
    // eslint-disable-next-line no-mixed-operators
    const deltaRot = (targetRot - source.rotation.y + Math.PI * 1.5) % (Math.PI * 2) - Math.PI;
    // make sure we don't turn faster than maxTurn
    const deltaRotation = minMagnitude(deltaRot, maxTurn);
    // keep rotation between 0 and Math.PI * 2
    // eslint-disable-next-line no-param-reassign
    source.rotation.y = THREE.Math.euclideanModulo(
      source.rotation.y + deltaRotation, Math.PI * 2,
    );
    // return the distance to the target
    return delta.length();
  };
}());

export class Animal extends Component {
  constructor(gameObject, model) {
    super(gameObject);
    this.helper = gameObject.addComponent(StateDisplayHelper, model.size);
    const hitRadius = model.size / 2;
    const skinInstance = gameObject.addComponent(SkinInstance, model);
    skinInstance.mixer.timeScale = globals.moveSpeed / 4;
    const { transform } = gameObject;
    const playerTransform = globals.player.gameObject.transform;
    const maxTurnSpeed = Math.PI * (globals.moveSpeed / 4);
    const targetHistory = [];
    let targetNdx = 0;

    function addHistory() {
      const targetGO = globals.congaLine[targetNdx];
      const newTargetPos = new THREE.Vector3();
      newTargetPos.copy(targetGO.transform.position);
      targetHistory.push(newTargetPos);
    }

    this.fsm = new FiniteStateMachine({
      idle: {
        enter: () => {
          skinInstance.setAnimation('Idle');
        },
        update: () => {
          // check if player is near
          if (isClose(transform, hitRadius, playerTransform, globals.playerRadius)) {
            this.fsm.transition('waitForEnd');
          }
        },
      },
      waitForEnd: {
        enter: () => {
          skinInstance.setAnimation('Jump');
        },
        update: () => {
          // get the gameObject at the end of the conga line
          const lastGO = globals.congaLine[globals.congaLine.length - 1];
          const deltaTurnSpeed = maxTurnSpeed * globals.deltaTime;
          const targetPos = lastGO.transform.position;
          aimTowardAndGetDistance(transform, targetPos, deltaTurnSpeed);
          // check if last thing in conga line is near
          if (isClose(transform, hitRadius, lastGO.transform, globals.playerRadius)) {
            this.fsm.transition('goToLast');
          }
        },
      },
      goToLast: {
        enter: () => {
          // remember who we're following
          targetNdx = globals.congaLine.length - 1;
          // add ourselves to the conga line
          globals.congaLine.push(gameObject);
          skinInstance.setAnimation('Walk');
        },
        update: () => {
          addHistory();
          // walk to the oldest point in the history
          const targetPos = targetHistory[0];
          const maxVelocity = globals.moveSpeed * globals.deltaTime;
          const deltaTurnSpeed = maxTurnSpeed * globals.deltaTime;
          const distance = aimTowardAndGetDistance(transform, targetPos, deltaTurnSpeed);
          const velocity = distance;
          transform.translateOnAxis(globals.kForward, Math.min(velocity, maxVelocity));
          if (distance <= maxVelocity) {
            this.fsm.transition('follow');
          }
        },
      },
      follow: {
        update: () => {
          addHistory();
          // remove the oldest history and just put ourselves there.
          const targetPos = targetHistory.shift();
          transform.position.copy(targetPos);
          const deltaTurnSpeed = maxTurnSpeed * globals.deltaTime;
          aimTowardAndGetDistance(transform, targetHistory[0], deltaTurnSpeed);
        },
      },
    }, 'idle');
  }

  update() {
    this.fsm.update();
    const dir = THREE.Math.radToDeg(this.gameObject.transform.rotation.y);
    this.helper.setState(`${this.fsm.state}:${dir.toFixed(0)}`);
  }
}

function makeTextTexture(str) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.canvas.width = 64;
  ctx.canvas.height = 64;
  ctx.font = '60px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFF';
  ctx.fillText(str, ctx.canvas.width / 2, ctx.canvas.height / 2);
  return new THREE.CanvasTexture(ctx.canvas);
}
const noteTexture = makeTextTexture('♪');

export class Note extends Component {
  constructor(gameObject) {
    super(gameObject);
    const { transform } = gameObject;
    const noteMaterial = new THREE.SpriteMaterial({
      color: new THREE.Color().setHSL(rand(1), 1, 0.5),
      map: noteTexture,
      side: THREE.DoubleSide,
      transparent: true,
    });
    const note = new THREE.Sprite(noteMaterial);
    note.scale.setScalar(3);
    transform.add(note);
    this.runner = new CoroutineRunner();
    const direction = new THREE.Vector3(rand(-0.2, 0.2), 1, rand(-0.2, 0.2));

    function* moveAndRemove() {
      for (let i = 0; i < 60; ++i) {
        transform.translateOnAxis(direction, globals.deltaTime * 10);
        noteMaterial.opacity = 1 - (i / 60);
        yield;
      }
      transform.parent.remove(transform);
      globals.gameObjectManager.removeGameObject(gameObject);
    }

    this.runner.add(moveAndRemove());
  }

  update() {
    this.runner.update();
  }
}
