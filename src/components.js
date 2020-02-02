import * as THREE from 'three';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils';
import globals from './globals';

// Base for all components
export class Component {
  constructor(gameObject) {
    this.gameObject = gameObject;
  }

  update() {
  }
}

export class SkinInstance extends Component {
  constructor(gameObject, model) {
    super(gameObject);
    this.model = model;
    this.animRoot = SkeletonUtils.clone(this.model.gltf.scene);
    this.mixer = new THREE.AnimationMixer(this.animRoot);
    gameObject.transform.add(this.animRoot);
    this.actions = {};
  }

  setAnimation(animName) {
    const clip = this.model.animations[animName];
    // eslint-disable-next-line no-restricted-syntax
    for (const action of Object.values(this.actions)) {
      // turn off all current actions
      action.enabled = false;
    }
    // get or create existing action for clip
    const action = this.mixer.clipAction(clip);
    action.enabled = true;
    action.reset();
    action.play();
    this.actions[animName] = action;
  }

  update() {
    this.mixer.update(globals.deltaTime);
  }
}
