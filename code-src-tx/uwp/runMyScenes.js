import * as SubImages from '../../code-gen/SubImage.js';
import Sprites from '../render/Sprites.js';
import { VERSION_BITS } from '../render/constants/BaseECS.js';
import Gamepads from '../uwp-input/Gamepads.js';
import { renderStore } from '../render/setupWebGL.js';

const GamepadButtons = Windows.Gaming.Input.GamepadButtons;

let cursorIdx;
export default function runMyScenes() {
    const cursor = Sprites.create(SubImages.CURSOR_MAGENTA, 0, 0, -2);
    cursorIdx = cursor >> VERSION_BITS;

    Sprites.create(SubImages.CARD_C6, 0, -1, -2.5);

    Sprites.create(SubImages.CARD_C6, -1, -1, -2.5);
    Sprites.create(SubImages.CARD_C6, 1, -1, -2.5);

    Sprites.create(SubImages.CARD_C6, -2, -1, -2.5);
    Sprites.create(SubImages.CARD_C6, 0, -1, -2.5);
    Sprites.create(SubImages.CARD_C6, 2, -1, -2.5);

    Sprites.create(SubImages.CARD_C6, -1, -1, -2.5);
    Sprites.create(SubImages.CARD_C6, 1, -1, -2.5);
    Sprites.create(SubImages.CARD_C6, 3.2, -0.9, -3);
    Sprites.create(SubImages.CARD_C6, -4, 1.5, -3);
    Sprites.create(SubImages.CARD_C6, 3, 1, -4);
}

//////////////////
// handle input //
//////////////////

export function handleInput() {
    for (const gamepad of Gamepads.gamepads) {
        const info = Gamepads.info.get(gamepad);
        const newReading = gamepad.getCurrentReading();

        if (Gamepads.buttonPressed(newReading, info.oldReading, GamepadButtons.a)) {
            console.log(`a gamepad pressed A button`);
            //Gamepads.vibrate(gamepad, info, heartBeatFrames);

        } else if (Gamepads.buttonReleased(newReading, info.oldReading, GamepadButtons.a)) {
            console.log(`a gamepad released A button`);
        }

        if (Gamepads.buttonPressed(newReading, info.oldReading, GamepadButtons.y)) {
            //signIn(gamepad);
        }

        if (info.isVibrating) {
            const vibration = info.vibration;
            if (renderStore.frame == vibration.nextTimeFrame) {
                vibration.currentFrame++;

                if (vibration.currentFrame < vibration.frames.length) {
                    const keyframe = vibration.frames[vibration.currentFrame];
                    vibration.nextTimeFrame = renderStore.frame + keyframe.duration;
                    gamepad.vibration = keyframe.vibration;

                } else {
                    info.isVibrating = false;
                }
            }
        }

        Sprites.setX(cursorIdx, Sprites.getX(cursorIdx) + newReading.leftThumbstickX);
        Sprites.setY(cursorIdx, Sprites.getY(cursorIdx) + newReading.leftThumbstickY);

        info.oldReading = newReading;
    }

}
