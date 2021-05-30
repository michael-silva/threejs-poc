import * as THREE from 'three';
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

// Base for all components
export class Component {
  constructor(gameObject) {
    this.gameObject = gameObject;
  }

  update() {
  }
}

export class SafeArray {
  constructor() {
    this.array = [];
    this.addQueue = [];
    this.removeQueue = new Set();
  }

  get isEmpty() {
    return this.addQueue.length + this.array.length > 0;
  }

  add(element) {
    this.addQueue.push(element);
  }

  remove(element) {
    this.removeQueue.add(element);
  }

  forEach(fn) {
    this._addQueued();
    this._removeQueued();
    // eslint-disable-next-line no-restricted-syntax
    for (const element of this.array) {
      if (this.removeQueue.has(element)) {
        // eslint-disable-next-line no-continue
        continue;
      }
      fn(element);
    }
    this._removeQueued();
  }

  _addQueued() {
    if (this.addQueue.length) {
      this.array.splice(this.array.length, 0, ...this.addQueue);
      this.addQueue = [];
    }
  }

  _removeQueued() {
    if (this.removeQueue.size) {
      this.array = this.array.filter((element) => !this.removeQueue.has(element));
      this.removeQueue.clear();
    }
  }
}

export class GameObjectManager {
  constructor() {
    this.gameObjects = new SafeArray();
  }

  createGameObject(parent, name) {
    const gameObject = new GameObject(parent, name);
    this.gameObjects.add(gameObject);
    return gameObject;
  }

  removeGameObject(gameObject) {
    this.gameObjects.remove(gameObject);
  }

  update(...args) {
    this.gameObjects.forEach((gameObject) => gameObject.update(...args));
  }
}

// Keeps the state of keys/buttons
//
// You can check
//
//   inputManager.keys.left.down
//
// to see if the left key is currently held down
// and you can check
//
//   inputManager.keys.left.justPressed
//
// To see if the left key was pressed this frame
//
// Keys are 'left', 'right', 'a', 'b', 'up', 'down'
export class InputManager {
  constructor() {
    this.keys = {};
    const keyMap = new Map();

    const setKey = (keyName, pressed) => {
      const keyState = this.keys[keyName];
      keyState.justPressed = pressed && !keyState.down;
      keyState.justReleased = !pressed && keyState.down;
      keyState.down = pressed;
    };

    const addKey = (keyCode, name) => {
      this.keys[name] = { down: false, justPressed: false };
      keyMap.set(keyCode, name);
    };

    const setKeyFromKeyCode = (keyCode, pressed) => {
      const keyName = keyMap.get(keyCode);
      if (!keyName) {
        return;
      }
      setKey(keyName, pressed);
    };

    addKey(37, 'left');
    addKey(39, 'right');
    addKey(38, 'up');
    addKey(40, 'down');
    addKey(32, 'space');
    addKey(90, 'a');
    addKey(83, 's');
    addKey(68, 'd');
    addKey(87, 'w');
    addKey(88, 'b');
    addKey(49, 'one');
    addKey(50, 'two');

    window.addEventListener('keydown', (e) => {
      setKeyFromKeyCode(e.keyCode, true);
    });
    window.addEventListener('keyup', (e) => {
      setKeyFromKeyCode(e.keyCode, false);
    });
  }

  update() {
    // eslint-disable-next-line no-restricted-syntax
    for (const keyState of Object.values(this.keys)) {
      if (keyState.justPressed) {
        keyState.justPressed = false;
      }
    }
  }
}

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

export class FiniteStateMachine {
  constructor(states, initialState) {
    this.states = states;
    this.transition(initialState);
  }

  get state() {
    return this.currentState;
  }

  transition(state) {
    const oldState = this.states[this.currentState];
    if (oldState && oldState.exit) {
      oldState.exit.call(this);
    }
    this.currentState = state;
    const newState = this.states[state];
    if (newState.enter) {
      newState.enter.call(this);
    }
  }

  update() {
    const state = this.states[this.currentState];
    if (state.update) {
      state.update.call(this);
    }
  }
}

export function* waitSeconds(duration) {
  while (duration > 0) {
    // eslint-disable-next-line no-param-reassign
    duration -= globals.deltaTime;
    yield;
  }
}

export class CoroutineRunner {
  constructor() {
    this.generatorStacks = [];
    this.addQueue = [];
    this.removeQueue = new Set();
  }

  isBusy() {
    return this.addQueue.length + this.generatorStacks.length > 0;
  }

  add(generator, delay = 0) {
    const genStack = [generator];
    if (delay) {
      genStack.push(waitSeconds(delay));
    }
    this.addQueue.push(genStack);
  }

  remove(generator) {
    this.removeQueue.add(generator);
  }

  update() {
    this._addQueued();
    this._removeQueued();
    // eslint-disable-next-line no-restricted-syntax
    for (const genStack of this.generatorStacks) {
      const main = genStack[0];
      // Handle if one coroutine removes another
      if (this.removeQueue.has(main)) {
        // eslint-disable-next-line no-continue
        continue;
      }
      while (genStack.length) {
        const topGen = genStack[genStack.length - 1];
        const { value, done } = topGen.next();
        if (done) {
          if (genStack.length === 1) {
            this.removeQueue.add(topGen);
            break;
          }
          genStack.pop();
        }
        else if (value) {
          genStack.push(value);
        }
        else {
          break;
        }
      }
    }
    this._removeQueued();
  }

  _addQueued() {
    if (this.addQueue.length) {
      this.generatorStacks.splice(this.generatorStacks.length, 0, ...this.addQueue);
      this.addQueue = [];
    }
  }

  _removeQueued() {
    if (this.removeQueue.size) {
      this.generatorStacks = this.generatorStacks
        .filter((genStack) => !this.removeQueue.has(genStack[0]));
      this.removeQueue.clear();
    }
  }
}

export function rand(min, max) {
  if (max === undefined) {
    // eslint-disable-next-line no-param-reassign
    max = min;
    // eslint-disable-next-line no-param-reassign
    min = 0;
  }
  return Math.random() * (max - min) + min;
}
