/* eslint-disable no-use-before-define,no-bitwise,no-mixed-operators,no-param-reassign,no-shadow */

/**
 * Three.js example based on tutorial
 * https://threejsfundamentals.org/threejs/lessons/threejs-game.html
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'dat.gui';
// import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils';
import globals from '../game-engine/globals';
import {
  ModelLoaderManager, GameObjectManager, InputManager, rand,
} from '../game-engine/utils';
import { Player } from './game-object';
import { Animal } from '../game-engine/components';
import { CameraInfo } from './components';

globals.setInitial({
  debug: true,
  time: 0,
  deltaTime: 0,
  moveSpeed: 16,
  kForward: new THREE.Vector3(0, 0, 1),
  models: {
    pig: { url: './assets/animals/Pig.gltf' },
    cow: { url: './assets/animals/Cow.gltf' },
    llama: { url: './assets/animals/Llama.gltf' },
    pug: { url: './assets/animals/Pug.gltf' },
    sheep: { url: './assets/animals/Sheep.gltf' },
    sheep2: { url: 'https:/threejsfundamentals.org/threejs/resources/models/animals/Sheep.gltf' },
    zebra: { url: './assets/animals/Zebra.gltf' },
    horse: { url: './assets/animals/Horse.gltf' },
    knight: { url: './assets/knight/KnightCharacter.gltf' },
  },
});

function main() {
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({ canvas });
  globals.canvas = canvas;

  const fov = 45;
  const aspect = 2; // the canvas default
  const near = 0.1;
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 20, 40);
  globals.camera = camera;

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 5, 0);
  controls.update();

  const scene = new THREE.Scene();
  globals.scene = scene;
  scene.background = new THREE.Color('white');

  function addLight(...pos) {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...pos);
    scene.add(light);
    scene.add(light.target);
  }
  addLight(5, 5, 2);
  addLight(-5, 5, 5);

  const { models } = globals;

  const progressbarElem = document.querySelector('#progressbar');
  function progressHandler(url, itemsLoaded, itemsTotal) {
    progressbarElem.style.width = `${itemsLoaded / itemsTotal * 100 | 0}%`;
  }

  const gameObjectManager = new GameObjectManager();
  globals.gameObjectManager = gameObjectManager;
  const inputManager = new InputManager();
  const modelManager = new ModelLoaderManager();
  // eslint-disable-next-line no-restricted-syntax
  for (const [name, model] of Object.entries(models)) {
    modelManager.addModelGLTF(model, name);
  }
  modelManager.onProgress(progressHandler);
  modelManager.onLoad(init);
  modelManager.loadAll();

  function init() {
    // hide the loading bar
    const loadingElem = document.querySelector('#loading');
    loadingElem.style.display = 'none';

    modelManager.eachModel(([, model]) => {
      if (model.animations.Walk) {
        model.animations.Walk.duration /= 2;
      }
    });

    {
      const gameObject = gameObjectManager.createGameObject(scene, 'player');
      gameObject.addComponent(Player);
      globals.playerObject = gameObject;
      globals.congaLine = [gameObject];
    }

    {
      const gameObject = gameObjectManager.createGameObject(camera, 'camera');
      globals.cameraInfo = gameObject.addComponent(CameraInfo);
    }

    const animalModelNames = [
      'pig',
      'cow',
      'llama',
      'pug',
      'sheep',
      'zebra',
      'horse',
    ];

    const base = new THREE.Object3D();
    const offset = new THREE.Object3D();
    base.add(offset);

    // position animals in a spiral.
    const numAnimals = 28;
    const arc = 10;
    const b = 10 / (2 * Math.PI);
    let r = 10;
    let phi = r / b;
    for (let i = 0; i < numAnimals; ++i) {
      const name = animalModelNames[rand(animalModelNames.length) | 0];
      const gameObject = gameObjectManager.createGameObject(scene, name);
      gameObject.addComponent(Animal, modelManager.getModel(name));
      base.rotation.y = phi;
      offset.position.x = r;
      offset.updateWorldMatrix(true, false);
      offset.getWorldPosition(gameObject.transform.position);
      phi += arc / r;
      r = b * phi;
    }
  }

  function resizeRendererToDisplaySize(renderer) {
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
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    gameObjectManager.update(inputManager);
    inputManager.update();

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

const labelContainerElem = document.querySelector('#labels');
function showHideDebugInfo() {
  labelContainerElem.style.display = globals.debug ? '' : 'none';
}
globals.labelContainerElem = labelContainerElem;

const gui = new GUI();
gui.add(globals, 'debug').onChange(showHideDebugInfo);
showHideDebugInfo();
main();
