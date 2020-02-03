import * as THREE from 'three';

export default {
  debug: true,
  time: 0,
  deltaTime: 0,
  moveSpeed: 16,
  kForward: new THREE.Vector3(0, 0, 1),
  models: {
    pig: { url: './example1/assets/animals/Pig.gltf' },
    cow: { url: './example1/assets/animals/Cow.gltf' },
    llama: { url: './example1/assets/animals/Llama.gltf' },
    pug: { url: './example1/assets/animals/Pug.gltf' },
    sheep: { url: './example1/assets/animals/Sheep.gltf' },
    sheep2: { url: 'https://threejsfundamentals.org/threejs/resources/models/animals/Sheep.gltf' },
    zebra: { url: './example1/assets/animals/Zebra.gltf' },
    horse: { url: './example1/assets/animals/Horse.gltf' },
    knight: { url: './example1/assets/knight/KnightCharacter.gltf' },
  },
};
