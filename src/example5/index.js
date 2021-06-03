/* eslint-disable no-param-reassign */
import * as THREE from 'three';
import { Player } from './game-objects';
import globals from '../game-engine/globals';
import {
  GameObjectManager, InputManager,
} from '../game-engine/utils';
import { CameraInfo } from './components';

globals.setInitial({
  debug: true,
  time: 0,
  deltaTime: 0,
  moveSpeed: 16,
});

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
