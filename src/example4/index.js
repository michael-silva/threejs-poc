/* eslint-disable no-use-before-define,no-bitwise,no-mixed-operators,no-param-reassign,no-shadow */

/**
 * Three.js example based on tutorial
 * https://threejsfundamentals.org/threejs/lessons/threejs-game.html
 */

import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils';
import globals from './globals';
import {
  GameObjectManager, InputManager, CameraInfo, rand,
} from './utils';
import { Player } from './game-object';
import { Animal } from './components';

/**
 * Create a happy little tree.
 */
/**
 * Create a happy little tree.
 */
function createTree(scene, posX, posZ) {
  const characterSize = 3;
  const outlineSize = characterSize * 0.05;
  // Set some random values so our trees look different.
  const randomScale = (Math.random() * 3) + 0.8;
  const randomRotateY = Math.PI / (Math.floor((Math.random() * 32) + 1));

  // Create the trunk.
  const trunkGeometry = new THREE.CylinderGeometry(
    characterSize / 3.5,
    characterSize / 2.5,
    characterSize * 1.3,
    8,
  );
  const trunkMaterial = new THREE.MeshToonMaterial({ color: 0x664422 });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);

  // Position the trunk based off of it's random given size.
  trunk.position.set(posX, ((characterSize * 1.3 * randomScale) / 2), posZ);
  // eslint-disable-next-line no-multi-assign
  trunk.scale.x = trunk.scale.y = trunk.scale.z = randomScale;
  scene.add(trunk);

  // Create the trunk outline.
  const outlineGeo1 = new THREE.CylinderGeometry(
    characterSize / 3.5 + outlineSize,
    characterSize / 2.5 + outlineSize,
    characterSize * 1.3 + outlineSize,
    8,
  );
  const outlineMat1 = new THREE.MeshBasicMaterial({
    color: 0x0000000,
    side: THREE.BackSide,
  });
  const outlineTrunk = new THREE.Mesh(outlineGeo1, outlineMat1);
  trunk.add(outlineTrunk);

  // Create the tree top.
  const geometry = new THREE.DodecahedronGeometry(characterSize);
  const material = new THREE.MeshToonMaterial({ color: 0x44aa44 });
  const treeTop = new THREE.Mesh(geometry, material);

  // Position the tree top based off of it's random given size.
  const posY = ((characterSize * 1.3 * randomScale) / 2) + characterSize * randomScale;
  treeTop.position.set(posX, posY, posZ);
  // eslint-disable-next-line no-multi-assign
  treeTop.scale.x = treeTop.scale.y = treeTop.scale.z = randomScale;
  treeTop.rotation.y = randomRotateY;
  scene.add(treeTop);

  // Create outline.
  const outlineGeo2 = new THREE.DodecahedronGeometry(characterSize + outlineSize);
  const outlineMat2 = new THREE.MeshBasicMaterial({
    color: 0x0000000,
    side: THREE.BackSide,
  });
  const outlineTreeTop = new THREE.Mesh(outlineGeo2, outlineMat2);
  treeTop.add(outlineTreeTop);
}

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

  // const controls = new OrbitControls(camera, canvas);
  // controls.target.set(0, 5, 0);
  // controls.update();

  const scene = new THREE.Scene();
  globals.scene = scene;
  scene.background = new THREE.Color(0x9ed3f3);
  scene.fog = new THREE.Fog(0x9ed3f3, fov, far);

  // Ambient lights.
  const ambient = new THREE.AmbientLight(0xffffff);
  scene.add(ambient);

  // Add hemisphere lighting.
  const hemisphereLight = new THREE.HemisphereLight(0xdddddd, 0x000000, 0.5);
  scene.add(hemisphereLight);

  /**
 * Create the floor of the scene.
 */
  function createFloor() {
    const geometry = new THREE.PlaneBufferGeometry(100000, 100000);
    const material = new THREE.MeshToonMaterial({ color: 0x336633 });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -1 * Math.PI / 2;
    plane.position.y = 0;
    scene.add(plane);
  }

  const { models } = globals;
  const manager = new THREE.LoadingManager();
  manager.onLoad = init;


  const progressbarElem = document.querySelector('#progressbar');
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    progressbarElem.style.width = `${itemsLoaded / itemsTotal * 100 | 0}%`;
  };

  const gameObjectManager = new GameObjectManager();
  globals.gameObjectManager = gameObjectManager;
  const inputManager = new InputManager();
  globals.inputManager = inputManager;

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
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    Object.values(models).forEach((model) => {
      box.setFromObject(model.gltf.scene);
      box.getSize(size);
      model.size = size.length();
      const animsByName = {};
      console.log('------->:', model.url);
      model.gltf.animations.forEach((clip) => {
        animsByName[clip.name] = clip;
        console.log('  ', clip.name);
        // Should really fix this in .blend file
        if (clip.name === 'Walk') {
          clip.duration /= 2;
        }
      });
      model.animations = animsByName;
    });
  }

  function init() {
    // hide the loading bar
    const loadingElem = document.querySelector('#loading');
    loadingElem.style.display = 'none';

    prepModelsAndAnimations();

    createFloor();

    createTree(scene, 10, 10);
    createTree(scene, 20, -10);
    createTree(scene, -20, 20);
    createTree(scene, -20, -20);

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


    camera.lookAt(globals.playerObject.transform.position);

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
    const arc = 20;
    const b = 20 / (2 * Math.PI);
    let radius = 20;
    let phi = radius / b;
    for (let i = 0; i < numAnimals; ++i) {
      const name = animalModelNames[rand(animalModelNames.length) | 0];
      const gameObject = gameObjectManager.createGameObject(scene, name);
      gameObject.addComponent(Animal, models[name]);
      base.rotation.y = phi;
      offset.position.x = radius;
      offset.updateWorldMatrix(true, false);
      offset.getWorldPosition(gameObject.transform.position);
      phi += arc / radius;
      radius = b * phi;
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
