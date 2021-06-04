/* eslint-disable no-param-reassign */

/**
 * Three.js example based on tutorial
 * https://tympanus.net/codrops/2019/10/14/how-to-create-an-interactive-3d-character-with-three-js/
 * Extra reference: https://github.com/shrekshao/gltf-avatar-threejs
 */

import * as THREE from 'three';
import {
  ModelLoaderManager, GameObjectManager, MouseMovement, resizeRendererToDisplaySize,
} from '../game-engine/utils';
import globals from '../game-engine/globals';
import { AttachedModel, LookAtMouse, Model } from './components';

const MODEL_NAME = 'bot'; // 'stacy'; // bot
globals.setInitial({
  debug: true,
  time: 0,
  deltaTime: 0,
  FLOOR_YPOS: -11,
  models: {
    sword: { url: './assets/sword1.gltf' },
    bot: { url: './assets/character.gltf' },
    stacy: {
      url: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy_lightweight.glb',
      texture: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy.jpg',
    },
  },
});

const loaderAnim = document.getElementById('js-loader');
let then = 0;
function render(now) {
  // convert to seconds
  globals.time = now * 0.001;
  // make sure delta time isn't too big.
  globals.deltaTime = Math.min(globals.time - then, 1 / 20);
  then = globals.time;

  resizeRendererToDisplaySize(globals.camera, globals.renderer);

  // update();
  globals.gameObjectManager.update(globals.inputManager);
  // inputManager.update();

  globals.renderer.render(globals.scene, globals.camera);

  requestAnimationFrame(render);
}

function init() {
  const canvas = document.querySelector('#canvas');
  const backgroundColor = 0xf1f1f1;

  // Init the scene
  const scene = new THREE.Scene();
  globals.scene = scene;
  scene.background = new THREE.Color(backgroundColor);
  scene.fog = new THREE.Fog(backgroundColor, 60, 100);

  // Init the renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  globals.renderer = renderer;

  // Add a camera
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.z = 30;
  camera.position.x = 0;
  camera.position.y = -3;
  globals.camera = camera;

  // Add lights
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61);
  hemiLight.position.set(0, 50, 0);
  // Add hemisphere light to scene
  scene.add(hemiLight);

  const d = 8.25;
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.54);
  dirLight.position.set(-8, 12, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 1500;
  dirLight.shadow.camera.left = d * -1;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = d * -1;
  // Add directional Light to scene
  scene.add(dirLight);

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1);
  const floorMaterial = new THREE.MeshPhongMaterial({
    color: 0xeeeeee,
    shininess: 0,
  });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -0.5 * Math.PI; // This is 90 degrees by the way
  floor.receiveShadow = true;
  floor.position.y = globals.FLOOR_YPOS;
  scene.add(floor);

  // just add a circle to background
  const geometry = new THREE.SphereGeometry(8, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0x9bffaf }); // 0xf2ce2e
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.z = -15;
  sphere.position.y = -2.5;
  sphere.position.x = -0.25;
  scene.add(sphere);

  const gameObject = globals.gameObjectManager.createGameObject(scene, 'model');
  const model = globals.modelManager.getModel(MODEL_NAME);
  gameObject.addComponent(Model, model);
  if (MODEL_NAME === 'bot') gameObject.addComponent(AttachedModel, model, globals.modelManager.getModel('sword'));
  if (MODEL_NAME === 'stacy')gameObject.addComponent(LookAtMouse, model);
  globals.playerObject = gameObject;

  loaderAnim.remove();
  requestAnimationFrame(render);
}

const gameObjectManager = new GameObjectManager();
globals.gameObjectManager = gameObjectManager;
const inputManager = new MouseMovement();
globals.inputManager = inputManager;
const modelManager = new ModelLoaderManager();
globals.modelManager = modelManager;
// eslint-disable-next-line no-restricted-syntax
for (const [name, model] of Object.entries(globals.models)) {
  modelManager.addModelGLTF(model, name);
}
modelManager.onLoad(init);
modelManager.loadAll();
