/* eslint-disable no-param-reassign */
import * as THREE from 'three';

const globals = {
  debug: true,
  time: 0,
  deltaTime: 0,
  moveSpeed: 16,
};

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

function main() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  globals.canvas = renderer.domElement;

  const fov = 70;
  const aspect = window.innerWidth / window.innerHeight; // the canvas default
  const near = 0.01;
  const far = 10;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 0.3, 0);
  globals.camera = camera;

  const scene = new THREE.Scene();
  globals.scene = scene;

  camera.lookAt(scene.position);

  const gridHelper = new THREE.GridHelper(40, 40);
  scene.add(gridHelper);
  scene.add(new THREE.AxesHelper());

  const gameObjectManager = new GameObjectManager();
  globals.gameObjectManager = gameObjectManager;
  const inputManager = new InputManager();
  globals.inputManager = inputManager;

  function init() {
    // hide the loading bar
    const loadingElem = document.getElementById('js-loader');
    loadingElem.style.display = 'none';

    {
      const gameObject = gameObjectManager.createGameObject(scene, 'player');
      globals.playerComponent = gameObject.addComponent(Player);
      globals.playerObject = gameObject;
    }

    {
      const gameObject = gameObjectManager.createGameObject(camera, 'camera');
      globals.cameraInfo = gameObject.addComponent(CameraInfo);
    }
  }

  // eslint-disable-next-line no-shadow
  function resizeRendererToDisplaySize(renderer) {
    // eslint-disable-next-line no-shadow
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  let then = 0;
  function render(now) {
    // convert to seconds
    globals.time = now * 0.001;
    // make sure delta time isn't too big.
    globals.deltaTime = Math.min(globals.time - then, 1 / 20);
    then = globals.time;

    if (resizeRendererToDisplaySize(renderer)) {
      // eslint-disable-next-line no-shadow
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    gameObjectManager.update(inputManager);
    inputManager.update();

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  init();
  requestAnimationFrame(render);
}

main();
