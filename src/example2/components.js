/* eslint-disable no-param-reassign */
import * as THREE from 'three';
import { Component } from '../game-engine/utils';
import globals from '../game-engine/globals';

export class AttachedModel extends Component {
  constructor(gameObject, baseModel, attachedModel) {
    super(gameObject);
    const model = baseModel.gltf.scene;
    const attached = attachedModel.gltf.scene;
    const hand = model.getObjectByName('mixamorigRightHand');
    const base = attached.getObjectByName('base');
    hand.add(base);
    base.scale.set(12, 12, 12);
    base.rotation.x = 1.4;
    base.position.x = hand.position.x + 16;
    base.position.y = hand.position.y - 4;
    base.position.z = hand.position.z - 7;

    model.add(attached);
  }
}
export class Model extends Component {
  constructor(gameObject, model) {
    super(gameObject);
    this.model = model;
    this.currentlyAnimating = false;
    this._prepareModel();
  }

  _prepareModel() {
    const { scene } = globals;
    const { gltf } = this.model;
    const model = gltf.scene;
    const fileAnimations = gltf.animations;
    // Set the models initial scale
    model.scale.set(7, 7, 7);
    model.position.y = globals.FLOOR_YPOS;

    scene.add(model);
    const skeleton = new THREE.SkeletonHelper(model);
    skeleton.visible = true;
    scene.add(skeleton);

    const mixer = new THREE.AnimationMixer(model);
    this.mixer = mixer;
    // const searchRegex = /^mixamorig(Spine|Neck)\.[a-z]*/i;
    const clips = fileAnimations.filter((val) => val.name !== 'idle');

    this.possibleAnims = clips.map((val) => {
      let clip = THREE.AnimationClip.findByName(clips, val.name);
      // filter by the tracks that don't use neck or spine bones
      // clip.tracks = clip.tracks.filter((track) => !searchRegex.test(track.name));
      clip = mixer.clipAction(clip);
      return clip;
    });

    const idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'idle');
    // filter by the tracks that don't use neck or spine bones
    // idleAnim.tracks = idleAnim.tracks.filter((track) => !searchRegex.test(track.name));

    const idle = mixer.clipAction(idleAnim);
    this._idle = idle;
    idle.play();
  }

  update() {
    const { scene, camera, inputManager } = globals;
    if (this._neck && this._waist) {
      this.moveJoint(this._neck, 50);
      this.moveJoint(this._waist, 30);
    }

    if (inputManager.keys.mouseLeft.justPressed) {
      // calculate objects intersecting the picking ray
      const intersects = inputManager.raycast(scene, camera);

      if (intersects.length) {
        // const { object } = intersects[0];
        // if (object.name === MODEL_NAME) {
        if (!this.currentlyAnimating) {
          this.currentlyAnimating = true;
          this.playOnClick();
        }
        // }
      }
    }

    this.mixer.update(globals.deltaTime);
  }

  playModifierAnimation(from, fSpeed, to, tSpeed) {
    to.setLoop(THREE.LoopOnce);
    to.reset();
    to.play();
    from.crossFadeTo(to, fSpeed, true);
    setTimeout(() => {
      from.enabled = true;
      to.crossFadeTo(from, tSpeed, true);
      this.currentlyAnimating = false;
      // eslint-disable-next-line no-underscore-dangle
    }, to._clip.duration * 1000 - ((tSpeed + fSpeed) * 1000));
  }

  // Get a random animation, and play it
  playOnClick() {
    const anim = Math.floor(Math.random() * this.possibleAnims.length) + 0;
    this.playModifierAnimation(this._idle, 0.25, this.possibleAnims[anim], 0.25);
  }
}

export class LookAtMouse extends Component {
  constructor(gameObject, model) {
    super(gameObject);
    this.model = model;
    this._prepareModel();
  }

  _prepareModel() {
    const { gltf } = this.model;
    const model = gltf.scene;
    model.traverse((o) => {
      // Reference the neck and waist bones
      if (o.isBone && o.name === 'mixamorigNeck') {
        this._neck = o;
      }
      if (o.isBone && o.name === 'mixamorigSpine') {
        this._waist = o;
      }
    });
  }

  update() {
    if (this._neck && this._waist) {
      this.moveJoint(this._neck, 50);
      this.moveJoint(this._waist, 30);
    }
  }

  moveJoint(joint, degreeLimit) {
    const { inputManager } = globals;
    const degrees = inputManager.getMouseDegrees(degreeLimit);
    joint.rotation.y = THREE.Math.degToRad(degrees.x);
    joint.rotation.x = THREE.Math.degToRad(degrees.y);
  }
}
