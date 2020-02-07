/* eslint-disable no-param-reassign */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TextureLoader } from 'three/examples/jsm/loaders/BasisTextureLoader';

// Set our main variables
let scene;
let renderer;
let camera;
let model; // Our character
let sword; // Our sword
let neck; // Reference to the neck bone in the skeleton
let waist; // Reference to the waist bone in the skeleton
let possibleAnims; // Animations found in our file
let mixer; // THREE.js animations mixer
let idle; // Idle, the default state our character returns to
const clock = new THREE.Clock(); // Used for anims, which run to a clock instead of frame rate
// Used to check whether characters neck is being used in another anim
let currentlyAnimating = false;
const raycaster = new THREE.Raycaster(); // Used to detect the click on our character
const FLOOR_YPOS = -11;
const loaderAnim = document.getElementById('js-loader');
const MODEL_NAME = 'bot'; // 'stacy'
let base;

function loading() {
  const MODEL_PATH = './example2/assets/boy.glb'; // 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy_lightweight.glb';
  const stacyTex = new THREE.TextureLoader().load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy.jpg');

  stacyTex.flipY = false; // we flip the texture so that its the right way up

  const stacyMat = new THREE.MeshPhongMaterial({
    map: stacyTex,
    color: 0xffffff,
    skinning: true,
  });
  const loader = new GLTFLoader();

  loader.load(
    MODEL_PATH,
    (gltf) => {
      model = gltf.scene;
      const fileAnimations = gltf.animations;
      // Set the models initial scale
      model.scale.set(7, 7, 7);
      model.position.y = FLOOR_YPOS;
      model.traverse((o) => {
        if (o.isBone) {
          console.log(o.name);
        }
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.material = stacyMat; // Add this line
        }
        // Reference the neck and waist bones
        if (o.isBone && o.name === 'mixamorigNeck') {
          neck = o;
        }
        if (o.isBone && o.name === 'mixamorigSpine') {
          waist = o;
        }
      });

      scene.add(model);

      loaderAnim.remove();

      mixer = new THREE.AnimationMixer(model);
      const searchRegex = /^mixamorig(Spine|Neck)\.[a-z]*/i;
      const clips = fileAnimations.filter((val) => val.name !== 'idle');
      possibleAnims = clips.map((val) => {
        let clip = THREE.AnimationClip.findByName(clips, val.name);
        // filter by the tracks that don't use neck or spine bones
        clip.tracks = clip.tracks.filter((track) => !searchRegex.test(track.name));
        clip = mixer.clipAction(clip);
        return clip;
      });
      const idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'idle');
      // filter by the tracks that don't use neck or spine bones
      idleAnim.tracks = idleAnim.tracks.filter((track) => !searchRegex.test(track.name));

      idle = mixer.clipAction(idleAnim);
      idle.play();
    },
    undefined, // We don't need this function
    (error) => {
      console.error(error);
    },
  );
}

// add noop update function to Object3D prototype
// so any Object3D may be a child of a Bone
THREE.Object3D.prototype.update = function () {};

function loading2() {
  const MODEL_PATH = './assets/character.gltf';
  const loader = new GLTFLoader();

  loader.load(
    MODEL_PATH,
    (gltf) => {
      model = gltf.scene;
      const fileAnimations = gltf.animations;
      // Set the models initial scale
      model.scale.set(7, 7, 7);
      model.position.y = FLOOR_YPOS;
      model.traverse((o) => {
        if (o.isBone) {
          // console.log(o.name);
        }
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      const hand = model.getObjectByName('mixamorigRightHand');
      base = sword.getObjectByName('base');
      hand.add(base);
      base.scale.set(12, 12, 12);
      base.rotation.x = 1.4;
      base.position.x = hand.position.x + 16;
      base.position.y = hand.position.y - 4;
      base.position.z = hand.position.z - 7;

      model.add(sword);
      scene.add(model);
      const skeleton = new THREE.SkeletonHelper(model);
      skeleton.visible = true;
      scene.add(skeleton);


      loaderAnim.remove();

      mixer = new THREE.AnimationMixer(model);
      const clips = fileAnimations.filter((val) => val.name !== 'idle');
      possibleAnims = clips.map((val) => {
        let clip = THREE.AnimationClip.findByName(clips, val.name);
        clip = mixer.clipAction(clip);
        return clip;
      });
      const idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'idle');
      idle = mixer.clipAction(idleAnim);
      idle.play();
    },
    undefined, // We don't need this function
    (error) => {
      console.error(error);
    },
  );
}

function loading3() {
  const MODEL_PATH = './assets/sword1.gltf';
  const loader = new GLTFLoader();

  loader.load(
    MODEL_PATH,
    (gltf) => {
      sword = gltf.scene;
      loading2();
    },
    undefined, // We don't need this function
    (error) => {
      console.error(error);
    },
  );
}

loading3();

function init() {
  const canvas = document.querySelector('#canvas');
  const backgroundColor = 0xf1f1f1;

  // Init the scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);
  scene.fog = new THREE.Fog(backgroundColor, 60, 100);

  // Init the renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);

  // Add a camera
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.z = 30;
  camera.position.x = 0;
  camera.position.y = -3;

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
  floor.quaternion.x = -0.5 * Math.PI; // This is 90 degrees by the way
  floor.receiveShadow = true;
  floor.position.y = FLOOR_YPOS;
  scene.add(floor);


  // just add a circle to background
  const geometry = new THREE.SphereGeometry(8, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0x9bffaf }); // 0xf2ce2e
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.z = -15;
  sphere.position.y = -2.5;
  sphere.position.x = -0.25;
  scene.add(sphere);
}

init();


// eslint-disable-next-line no-shadow
function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const canvasPixelWidth = canvas.width / window.devicePixelRatio;
  const canvasPixelHeight = canvas.height / window.devicePixelRatio;

  const needResize = canvasPixelWidth !== width || canvasPixelHeight !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function update() {
  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  if (mixer) {
    // console.log(sword.getWorldPosition());
    mixer.update(clock.getDelta());
  }

  renderer.render(scene, camera);
  requestAnimationFrame(update);
}

update();

function getMouseDegrees(x, y, degreeLimit) {
  let dx = 0;
  let dy = 0;
  let xdiff;
  let xPercentage;
  let ydiff;
  let yPercentage;

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

function getMousePos(e) {
  return { x: e.clientX, y: e.clientY };
}

function moveJoint(mouse, joint, degreeLimit) {
  const degrees = getMouseDegrees(mouse.x, mouse.y, degreeLimit);
  joint.quaternion.y = THREE.Math.degToRad(degrees.x);
  joint.quaternion.x = THREE.Math.degToRad(degrees.y);
}

function playModifierAnimation(from, fSpeed, to, tSpeed) {
  to.setLoop(THREE.LoopOnce);
  to.reset();
  to.play();
  from.crossFadeTo(to, fSpeed, true);
  setTimeout(() => {
    from.enabled = true;
    to.crossFadeTo(from, tSpeed, true);
    currentlyAnimating = false;
  // eslint-disable-next-line no-underscore-dangle
  }, to._clip.duration * 1000 - ((tSpeed + fSpeed) * 1000));
}

// Get a random animation, and play it
function playOnClick() {
  const anim = Math.floor(Math.random() * possibleAnims.length) + 0;
  playModifierAnimation(idle, 0.25, possibleAnims[anim], 0.25);
}

function raycast(e, touch = false) {
  const mouse = {};
  if (touch) {
    mouse.x = 2 * (e.changedTouches[0].clientX / window.innerWidth) - 1;
    mouse.y = 1 - 2 * (e.changedTouches[0].clientY / window.innerHeight);
  }
  else {
    mouse.x = 2 * (e.clientX / window.innerWidth) - 1;
    mouse.y = 1 - 2 * (e.clientY / window.innerHeight);
  }
  // update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects[0]) {
    const { object } = intersects[0];
    console.log(object, 'name');

    // if (object.name === MODEL_NAME) {
    if (!currentlyAnimating) {
      currentlyAnimating = true;
      playOnClick();
    }
    // }
  }
}

document.addEventListener('mousemove', (e) => {
  const mousecoords = getMousePos(e);
  if (neck && waist) {
    moveJoint(mousecoords, neck, 50);
    moveJoint(mousecoords, waist, 30);
  }
});

window.addEventListener('click', (e) => raycast(e));
window.addEventListener('touchend', (e) => raycast(e, true));
