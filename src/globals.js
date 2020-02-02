import * as THREE from 'three';

export default {
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
    sheep2: { url: 'https://threejsfundamentals.org/threejs/resources/models/animals/Sheep.gltf' },
    zebra: { url: './assets/animals/Zebra.gltf' },
    horse: { url: './assets/animals/Horse.gltf' },
    knight: { url: './assets/knight/KnightCharacter.gltf' },
  },
};
