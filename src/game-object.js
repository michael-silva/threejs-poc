import * as THREE from 'three';
import { Component, SkinInstance } from './components';
import globals from './globals';

function removeArrayElement(array, element) {
  const ndx = array.indexOf(element);
  if (ndx >= 0) {
    array.splice(ndx, 1);
  }
}

export class GameObject {
  constructor(parent, name) {
    this.name = name;
    this.components = [];
    this.transform = new THREE.Object3D();
    parent.add(this.transform);
  }

  addComponent(ComponentType, ...args) {
    const component = new ComponentType(this, ...args);
    this.components.push(component);
    return component;
  }

  removeComponent(component) {
    removeArrayElement(this.components, component);
  }

  getComponent(ComponentType) {
    return this.components.find((c) => c instanceof ComponentType);
  }

  update(...args) {
    this.components.forEach((component) => {
      component.update(...args);
    });
  }
}

export class Player extends Component {
  constructor(gameObject) {
    super(gameObject);
    const model = globals.models.knight;
    this.skinInstance = gameObject.addComponent(SkinInstance, model);
    this.skinInstance.setAnimation('Run');
    this.turnSpeed = globals.moveSpeed / 4;

    this.offscreenTimer = 0;
    this.maxTimeOffScreen = 3;
  }

  update(inputManager) {
    const { deltaTime, moveSpeed, cameraInfo } = globals;
    const { transform } = this.gameObject;
    const delta = (inputManager.keys.left.down ? 1 : 0)
                  + (inputManager.keys.right.down ? -1 : 0);
    transform.rotation.y += this.turnSpeed * delta * deltaTime;
    transform.translateOnAxis(globals.kForward, moveSpeed * deltaTime);

    const { frustum } = cameraInfo;
    if (frustum.containsPoint(transform.position)) {
      this.offscreenTimer = 0;
    }
    else {
      this.offscreenTimer += deltaTime;
      if (this.offscreenTimer >= this.maxTimeOffScreen) {
        transform.position.set(0, 0, 0);
      }
    }
  }
}
