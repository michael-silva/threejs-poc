import * as THREE from 'three';
import { GameObject } from './game-object';
import globals from './globals';
import { Component } from './components';

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
    addKey(90, 'a');
    addKey(88, 'b');

    window.addEventListener('keydown', (e) => {
      setKeyFromKeyCode(e.keyCode, true);
    });
    window.addEventListener('keyup', (e) => {
      setKeyFromKeyCode(e.keyCode, false);
    });

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

    function handleMouseMove(e) {
      e.preventDefault();
      checkSides({
        touches: [e],
      });
    }

    function handleMouseUp() {
      clearKeys();
      window.removeEventListener('mousemove', handleMouseMove, { passive: false });
      window.removeEventListener('mouseup', handleMouseUp);
    }

    uiElem.addEventListener('mousedown', (e) => {
      handleMouseMove(e);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }, { passive: false });
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
  }

  update() {
    const { camera } = globals;
    this.projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    this.frustum.setFromMatrix(this.projScreenMatrix);
  }
}
