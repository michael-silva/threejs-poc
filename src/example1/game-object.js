import { SkinInstance, Note } from '../game-engine/components';
import globals from '../game-engine/globals';
import {
  Component, CoroutineRunner, rand, waitSeconds,
} from '../game-engine/utils';

export class Player extends Component {
  constructor(gameObject) {
    super(gameObject);
    const model = globals.models.knight;
    this.skinInstance = gameObject.addComponent(SkinInstance, model);
    this.skinInstance.setAnimation('Run');
    this.turnSpeed = globals.moveSpeed / 4;

    this.offscreenTimer = 0;
    this.maxTimeOffScreen = 3;
    globals.playerRadius = model.size / 2;

    // coroutine
    this.runner = new CoroutineRunner();

    function* emitNotes() {
      for (;;) {
        yield waitSeconds(rand(0.5, 1));
        const noteGO = globals.gameObjectManager.createGameObject(globals.scene, 'note');
        noteGO.transform.position.copy(gameObject.transform.position);
        noteGO.transform.position.y += 5;
        noteGO.addComponent(Note);
      }
    }

    this.runner.add(emitNotes());
  }

  update(inputManager) {
    this.runner.update();
    const { deltaTime, moveSpeed, cameraInfo } = globals;
    const { transform } = this.gameObject;
    const delta = (inputManager.keys.left.down ? 1 : 0)
                  + (inputManager.keys.right.down ? -1 : 0);
    transform.rotation.y += this.turnSpeed * delta * deltaTime;
    transform.translateOnAxis(globals.kForward, moveSpeed * deltaTime);

    const { frustum } = cameraInfo;
    if (frustum.containsPoint(transform.position)) {
      this.offscreenTimer = 0;
    }
    else {
      this.offscreenTimer += deltaTime;
      if (this.offscreenTimer >= this.maxTimeOffScreen) {
        transform.position.set(0, 0, 0);
      }
    }
  }
}
