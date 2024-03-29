/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-properties */
/* eslint-disable new-cap */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

window.Ammo().then((Ammo) => {
  // - Global variables -

  // Heightfield parameters
  const terrainWidthExtents = 100;
  const terrainDepthExtents = 100;
  const terrainWidth = 128;
  const terrainDepth = 128;
  const terrainHalfWidth = terrainWidth / 2;
  const terrainHalfDepth = terrainDepth / 2;
  const terrainMaxHeight = 8;
  const terrainMinHeight = -2;

  // Graphics variables
  let container;
  let camera; let controls; let scene; let
    renderer;
  let terrainMesh;
  const clock = new THREE.Clock();

  // Physics variables
  let collisionConfiguration;
  let dispatcher;
  let broadphase;
  let solver;
  let physicsWorld;
  const dynamicObjects = [];
  const transformAux1 = new Ammo.btTransform();

  let heightData = null;
  let ammoHeightData = null;

  let time = 0;
  const objectTimePeriod = 3;
  let timeNextSpawn = time + objectTimePeriod;
  const maxNumObjects = 30;

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function initGraphics() {
    const canvas = document.querySelector('#canvas');
    container = document.getElementById('container');

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);

    scene = new THREE.Scene();

    camera.position.y = heightData[terrainHalfWidth + terrainHalfDepth * terrainWidth]
      * (terrainMaxHeight - terrainMinHeight) + 5;

    camera.position.z = terrainDepthExtents / 2;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    controls = new OrbitControls(camera, canvas);

    const geometry = new THREE.PlaneBufferGeometry(100, 100, terrainWidth - 1, terrainDepth - 1);
    geometry.rotateX(-Math.PI / 2);

    const vertices = geometry.attributes.position.array;

    for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
      // j + 1 because it is the y component that we modify
      vertices[j + 1] = heightData[i];
    }

    geometry.computeVertexNormals();

    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0xC7C7C7 });
    terrainMesh = new THREE.Mesh(geometry, groundMaterial);
    scene.add(terrainMesh);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('../textures/grid.png', (texture) => {
      /* eslint-disable no-param-reassign */
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(terrainWidth - 1, terrainDepth - 1);
      /* eslint-enable no-param-reassign */
      groundMaterial.map = texture;
      groundMaterial.needsUpdate = true;
    });

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 10, 5);
    scene.add(dirLight);

    renderer = new THREE.WebGLRenderer(canvas);
    renderer.setClearColor(0xbfd1e5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    container.innerHTML = '';

    container.appendChild(renderer.domElement);

    //

    window.addEventListener('resize', onWindowResize, false);
  }

  function createTerrainShape() {
    // This parameter is not really used,
    // since we are using PHY_FLOAT height data type and hence it is ignored
    const heightScale = 1;

    // Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
    const upAxis = 1;

    // hdt, height data type. "PHY_FLOAT" is used.
    // Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
    const hdt = 'PHY_FLOAT';

    // Set this to your needs (inverts the triangles)
    const flipQuadEdges = false;

    // Creates height data buffer in Ammo heap
    // eslint-disable-next-line no-underscore-dangle
    ammoHeightData = Ammo._malloc(4 * terrainWidth * terrainDepth);

    // Copy the javascript height data array to the Ammo one.
    let p = 0;
    let p2 = 0;
    for (let j = 0; j < terrainDepth; j++) {
      for (let i = 0; i < terrainWidth; i++) {
        // write 32-bit float data to memory
        // eslint-disable-next-line no-bitwise, no-param-reassign
        Ammo.HEAPF32[ammoHeightData + p2 >> 2] = heightData[p];

        p++;

        // 4 bytes/float
        p2 += 4;
      }
    }

    // Creates the heightfield physics shape
    const heightFieldShape = new Ammo.btHeightfieldTerrainShape(

      terrainWidth,
      terrainDepth,

      ammoHeightData,

      heightScale,
      terrainMinHeight,
      terrainMaxHeight,

      upAxis,
      hdt,
      flipQuadEdges,
    );

    // Set horizontal scale
    const scaleX = terrainWidthExtents / (terrainWidth - 1);
    const scaleZ = terrainDepthExtents / (terrainDepth - 1);
    heightFieldShape.setLocalScaling(new Ammo.btVector3(scaleX, 1, scaleZ));

    heightFieldShape.setMargin(0.05);

    return heightFieldShape;
  }

  function initPhysics() {
    // Physics configuration

    collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    broadphase = new Ammo.btDbvtBroadphase();
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(
      dispatcher,
      broadphase,
      solver,
      collisionConfiguration,
    );
    physicsWorld.setGravity(new Ammo.btVector3(0, -6, 0));

    // Create the terrain body

    const groundShape = createTerrainShape(heightData);
    const groundTransform = new Ammo.btTransform();
    groundTransform.setIdentity();
    // Shifts the terrain, since bullet re-centers it on its bounding box.
    groundTransform.setOrigin(new Ammo.btVector3(0, (terrainMaxHeight + terrainMinHeight) / 2, 0));
    const groundMass = 0;
    const groundLocalInertia = new Ammo.btVector3(0, 0, 0);
    const groundMotionState = new Ammo.btDefaultMotionState(groundTransform);
    const groundBody = new Ammo.btRigidBody(new Ammo.btRigidBodyConstructionInfo(
      groundMass,
      groundMotionState,
      groundShape,
      groundLocalInertia,
    ));
    physicsWorld.addRigidBody(groundBody);
  }

  function generateHeight(width, depth, minHeight, maxHeight) {
    // Generates the height data (a sinus wave)

    const size = width * depth;
    const data = new Float32Array(size);

    const hRange = maxHeight - minHeight;
    const w2 = width / 2;
    const d2 = depth / 2;
    const phaseMult = 12;

    let p = 0;
    for (let j = 0; j < depth; j++) {
      for (let i = 0; i < width; i++) {
        const radius = Math.sqrt(
          Math.pow((i - w2) / w2, 2.0)
                          + Math.pow((j - d2) / d2, 2.0),
        );

        const height = (Math.sin(radius * phaseMult) + 1) * 0.5 * hRange + minHeight;

        data[p] = height;

        p++;
      }
    }

    return data;
  }

  function createObjectMaterial() {
    // eslint-disable-next-line no-bitwise
    const c = Math.floor(Math.random() * (1 << 24));
    return new THREE.MeshPhongMaterial({ color: c });
  }

  function generateObject() {
    const numTypes = 4;
    const objectType = Math.ceil(Math.random() * numTypes);

    let threeObject = null;
    let shape = null;
    let radius = null;
    let height = null;
    let sx = 0;
    let sy = 0;
    let sz = 0;

    const objectSize = 3;
    const margin = 0.05;

    switch (objectType) {
      case 1:
        // Sphere
        radius = 1 + Math.random() * objectSize;
        threeObject = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 20, 20),
          createObjectMaterial(),
        );
        shape = new Ammo.btSphereShape(radius);
        shape.setMargin(margin);
        break;
      case 2:
        // Box
        sx = 1 + Math.random() * objectSize;
        sy = 1 + Math.random() * objectSize;
        sz = 1 + Math.random() * objectSize;
        threeObject = new THREE.Mesh(
          new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1),
          createObjectMaterial(),
        );
        shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
        shape.setMargin(margin);
        break;
      case 3:
        // Cylinder
        radius = 1 + Math.random() * objectSize;
        height = 1 + Math.random() * objectSize;
        threeObject = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, height, 20, 1),
          createObjectMaterial(),
        );
        shape = new Ammo.btCylinderShape(new Ammo.btVector3(radius, height * 0.5, radius));
        shape.setMargin(margin);
        break;
      default:
        // Cone
        radius = 1 + Math.random() * objectSize;
        height = 2 + Math.random() * objectSize;
        threeObject = new THREE.Mesh(
          new THREE.CylinderGeometry(0, radius, height, 20, 2),
          createObjectMaterial(),
        );
        shape = new Ammo.btConeShape(radius, height);
        break;
    }

    threeObject.position.set(
      (Math.random() - 0.5) * terrainWidth * 0.6, terrainMaxHeight + objectSize + 2,
      (Math.random() - 0.5) * terrainDepth * 0.6,
    );

    const mass = objectSize * 5;
    const localInertia = new Ammo.btVector3(0, 0, 0);
    shape.calculateLocalInertia(mass, localInertia);
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    const pos = threeObject.position;
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    const motionState = new Ammo.btDefaultMotionState(transform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
    const body = new Ammo.btRigidBody(rbInfo);

    threeObject.userData.physicsBody = body;

    scene.add(threeObject);
    dynamicObjects.push(threeObject);

    physicsWorld.addRigidBody(body);
  }

  function updatePhysics(deltaTime) {
    physicsWorld.stepSimulation(deltaTime, 10);

    // Update objects
    for (let i = 0, il = dynamicObjects.length; i < il; i++) {
      const objThree = dynamicObjects[i];
      const objPhys = objThree.userData.physicsBody;
      const ms = objPhys.getMotionState();
      if (ms) {
        ms.getWorldTransform(transformAux1);
        const p = transformAux1.getOrigin();
        const q = transformAux1.getRotation();
        objThree.position.set(p.x(), p.y(), p.z());
        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    }
  }

  function init() {
    heightData = generateHeight(terrainWidth, terrainDepth, terrainMinHeight, terrainMaxHeight);

    initGraphics();

    initPhysics();
  }

  function render() {
    const deltaTime = clock.getDelta();

    if (dynamicObjects.length < maxNumObjects && time > timeNextSpawn) {
      generateObject();
      timeNextSpawn = time + objectTimePeriod;
    }

    updatePhysics(deltaTime);

    controls.update(deltaTime);

    renderer.render(scene, camera);

    time += deltaTime;
  }

  function animate() {
    requestAnimationFrame(animate);

    render();
  }

  // - Main code -
  init();
  animate();
});
