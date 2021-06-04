import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import globals from './globals';

export function resizeRendererToDisplaySize(camera, renderer) {
  const canvas = renderer.domElement;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const canvasPixelWidth = canvas.width / window.devicePixelRatio;
  const canvasPixelHeight = canvas.height / window.devicePixelRatio;

  const needResize = canvasPixelWidth !== width || canvasPixelHeight !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
    // eslint-disable-next-line no-param-reassign
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
  return needResize;
}

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

export class ModelLoaderManager {
  constructor() {
    this.loadingManager = new THREE.LoadingManager();
    this.modelsIndex = {};
    this.loaders = {};
  }

  _eachLoader(callback) {
    // eslint-disable-next-line no-restricted-syntax
    for (const loader of Object.values(this.loaders)) callback(loader);
  }

  _prepareModels() {
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    this._eachLoader(({ models }) => {
      models.forEach(([, model]) => {
        let materialTex;
        if (model.texture) {
          const stacyTex = new THREE.TextureLoader().load(model.texture);
          stacyTex.flipY = false; // we flip the texture so that its the right way up

          materialTex = new THREE.MeshPhongMaterial({
            map: stacyTex,
            color: 0xffffff,
            skinning: true,
          });
        }

        box.setFromObject(model.gltf.scene || model.gltf);
        box.getSize(size);
        // eslint-disable-next-line no-param-reassign
        model.size = size.length();
        const animsByName = {};
        console.log('------->:', model.url);
        model.gltf.animations.forEach((clip) => {
          animsByName[clip.name] = clip;
          console.log('  ', clip.name);
        });
        // eslint-disable-next-line no-param-reassign
        model.animations = animsByName;

        model.gltf.scene.traverse((o) => {
          if (o.isBone) {
            console.log(o.name);
          }
          if (o.isMesh) {
            /* eslint-disable no-param-reassign */
            o.castShadow = true;
            o.receiveShadow = true;
            if (materialTex) {
              o.material = materialTex;
            }
            /* eslint-enable no-param-reassign */
          }
        });
      });
    });
    if (this._onAllLoad) { this._onAllLoad(); }
  }

  eachModel(callback) {
    this._eachLoader(({ models }) => {
      models.forEach(callback);
    });
  }

  getModel(name) {
    return this.modelsIndex[name];
  }

  addModelGLTF(model, name) {
    if (!this.loaders.gltf) {
      this.loaders.gltf = { loader: new GLTFLoader(this.loadingManager), models: [] };
    }
    this.loaders.gltf.models.push([name, model]);
    if (this.modelsIndex[name]) throw new Error(`Already has an model with name [${name}] in index`);
    this.modelsIndex[name] = model;
    // console.log(name);
  }

  loadAll() {
    this.loadingManager.onLoad = this._prepareModels.bind(this);
    this._eachLoader(({ loader, models }) => {
      console.log(models);
      models.forEach(([name, model]) => {
        console.log(name);
        loader.load(model.url, (gltf) => {
          // eslint-disable-next-line no-param-reassign
          if (model.onLoad) { model.gltf = model.onLoad(gltf) || gltf; }
          // eslint-disable-next-line no-param-reassign
          else model.gltf = gltf;
        },
        undefined, // We don't need this function
        (error) => {
          console.error(error);
        });
      });
    });
  }

  onProgress(callback) {
    this.loadingManager.onProgress = callback;
  }

  onLoad(callback) {
    this._onAllLoad = callback;
  }
}

export class MouseMovement {
  constructor() {
    this._mousePosition = { x: 0, y: 0 };
    this.keys = {
      touch: { down: false, justPressed: false },
      mouseLeft: { down: false, justPressed: false },
      mouseRight: { down: false, justPressed: false },
    };
    this.raycaster = new THREE.Raycaster();
    document.addEventListener('mousemove', (e) => {
      this._mousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousedown', (e) => {
      if (e.buttons === 1) {
        this._setKey('mouseLeft', true);
      }
      else if (e.buttons === 2) {
        this._setKey('mouseRight', true);
      }
    });
    window.addEventListener('mouseup', () => {
      if (this.keys.mouseLeft.down) {
        this._setKey('mouseLeft', false);
      }
      else if (this.keys.mouseRight.down) {
        this._setKey('mouseRight', false);
      }
    });
    window.addEventListener('touchstart', (e) => {
      // eslint-disable-next-line prefer-destructuring
      this._mousePosition = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    });
    window.addEventListener('touchend', (e) => {
      // eslint-disable-next-line prefer-destructuring
      this._mousePosition = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    });
  }

  _setKey(keyName, pressed) {
    const keyState = this.keys[keyName];
    keyState.justPressed = pressed && !keyState.down;
    keyState.justReleased = !pressed && keyState.down;
    keyState.down = pressed;
  }

  getMouseDegrees(degreeLimit) {
    let dx = 0;
    let dy = 0;
    let xdiff;
    let xPercentage;
    let ydiff;
    let yPercentage;

    const { x, y } = this._mousePosition;
    const w = { x: window.innerWidth, y: window.innerHeight };

    // Left (Rotates neck left between 0 and -degreeLimit)

    // 1. If cursor is in the left half of screen
    if (x <= w.x / 2) {
      // 2. Get the difference between middle of screen and cursor position
      xdiff = w.x / 2 - x;
      // 3. Find the percentage of that difference (percentage toward edge of screen)
      xPercentage = (xdiff / (w.x / 2)) * 100;
      // 4. Convert that to a percentage of the maximum rotation we allow for the neck
      dx = ((degreeLimit * xPercentage) / 100) * -1;
    }
    // Right (Rotates neck right between 0 and degreeLimit)
    if (x >= w.x / 2) {
      xdiff = x - w.x / 2;
      xPercentage = (xdiff / (w.x / 2)) * 100;
      dx = (degreeLimit * xPercentage) / 100;
    }
    // Up (Rotates neck up between 0 and -degreeLimit)
    if (y <= w.y / 2) {
      ydiff = w.y / 2 - y;
      yPercentage = (ydiff / (w.y / 2)) * 100;
      // Note that I cut degreeLimit in half when she looks up
      dy = (((degreeLimit * 0.5) * yPercentage) / 100) * -1;
    }

    // Down (Rotates neck down between 0 and degreeLimit)
    if (y >= w.y / 2) {
      ydiff = y - w.y / 2;
      yPercentage = (ydiff / (w.y / 2)) * 100;
      dy = (degreeLimit * yPercentage) / 100;
    }
    return { x: dx, y: dy };
  }

  getMousePos() {
    return this._mousePosition;
  }

  raycast(scene, camera) {
    const mouseCoords = this.getMousePos();
    const mouse = {};
    if (this.keys.touch.down) {
      mouse.x = 2 * (mouseCoords.x / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (mouseCoords.y / window.innerHeight);
    }
    else {
      mouse.x = 2 * (mouseCoords.x / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (mouseCoords.y / window.innerHeight);
    }
    // update the picking ray with the camera and mouse position
    this.raycaster.setFromCamera(mouse, camera);

    // calculate objects intersecting the picking ray
    return this.raycaster.intersectObjects(scene.children, true);
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

    /** required just to sample 1 */
    const sides = [
      { elem: document.querySelector('#left'), key: 'left' },
      { elem: document.querySelector('#right'), key: 'right' },
    ];

    const clearKeys = () => {
      // eslint-disable-next-line no-restricted-syntax
      for (const { key } of sides) {
        setKey(key, false);
      }
    };

    const checkSides = (e) => {
      // eslint-disable-next-line no-restricted-syntax
      for (const { elem, key } of sides) {
        let pressed = false;
        const rect = elem.getBoundingClientRect();
        // eslint-disable-next-line no-restricted-syntax
        for (const touch of e.touches) {
          const x = touch.clientX;
          const y = touch.clientY;
          const inRect = x >= rect.left && x < rect.right
                         && y >= rect.top && y < rect.bottom;
          if (inRect) {
            pressed = true;
          }
        }
        setKey(key, pressed);
      }
    };

    const uiElem = document.querySelector('#ui');
    if (uiElem) {
      uiElem.addEventListener('touchstart', (e) => {
        e.preventDefault();
        checkSides(e);
      }, { passive: false });
      uiElem.addEventListener('touchmove', (e) => {
        e.preventDefault(); // prevent scroll
        checkSides(e);
      }, { passive: false });
      uiElem.addEventListener('touchend', () => {
        clearKeys();
      });

      const handleMouseMove = (e) => {
        e.preventDefault();
        checkSides({
          touches: [e],
        });
      };

      const handleMouseUp = () => {
        clearKeys();
        window.removeEventListener('mousemove', handleMouseMove, { passive: false });
        window.removeEventListener('mouseup', handleMouseUp);
      };

      uiElem.addEventListener('mousedown', (e) => {
        handleMouseMove(e);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }, { passive: false });
    }
    /** ======================================= */
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
