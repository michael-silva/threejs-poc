/* eslint-disable no-use-before-define,no-bitwise,no-mixed-operators,no-param-reassign,no-shadow */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils';
import globals from './globals';
import { GameObjectManager, InputManager, CameraInfo } from './utils';
import { Player } from './game-object';

function main() {
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({ canvas });

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
  const manager = new THREE.LoadingManager();
  manager.onLoad = init;

  const progressbarElem = document.querySelector('#progressbar');
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    progressbarElem.style.width = `${itemsLoaded / itemsTotal * 100 | 0}%`;
  };

  const gameObjectManager = new GameObjectManager();
  const inputManager = new InputManager();

  {
    const gltfLoader = new GLTFLoader(manager);
    // eslint-disable-next-line no-restricted-syntax
    for (const model of Object.values(models)) {
      gltfLoader.load(model.url, (gltf) => {
        model.gltf = gltf;
      });
    }
  }

  function prepModelsAndAnimations() {
    Object.values(models).forEach((model) => {
      const animsByName = {};
      console.log('------->:', model.url);
      model.gltf.animations.forEach((clip) => {
        animsByName[clip.name] = clip;
        console.log('  ', clip.name);
      });
      model.animations = animsByName;
    });
  }

  function init() {
    // hide the loading bar
    const loadingElem = document.querySelector('#loading');
    loadingElem.style.display = 'none';

    prepModelsAndAnimations();

    {
      const gameObject = gameObjectManager.createGameObject(scene, 'player');
      gameObject.addComponent(Player);
    }

    {
      const gameObject = gameObjectManager.createGameObject(camera, 'camera');
      globals.cameraInfo = gameObject.addComponent(CameraInfo);
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

main();
