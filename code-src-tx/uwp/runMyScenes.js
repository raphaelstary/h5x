import * as SubImages from '../../code-gen/SubImage.js';
import Sprites from '../render/Sprites.js';
import { VERSION_BITS } from '../render/constants/BaseECS.js';
import Gamepads from '../uwp-input/Gamepads.js';
import { renderStore } from '../render/setupWebGL.js';
import FontSubImage from '../../code-gen/FontSubImage.js';

const GamepadButtons = Windows.Gaming.Input.GamepadButtons;

const CursorBorder = {
    TOP: 2,
    LEFT: -3.55,
    BOTTOM: -2,
    RIGHT: 3.55
};

const ScreenPosition = {
    CENTER: { x: 0, y: 0 },
    TOP_LEFT: { x: -3.55, y: 2 },
    TOP_RIGHT: { x: 3.55, y: 2 },
    BOTTOM_LEFT: { x: -3.55, y: -2 },
    BOTTOM_RIGHT: { x: 3.55, y: -2 }
};

let cursorIdx;

const player = {
    x: ScreenPosition.CENTER.x,
    y: ScreenPosition.CENTER.y,
    forceX: 0,
    forceY: 0,
    magnitudeSq: 0,
    changed: false
};

export default function runMyScenes() {

    const cursor = Sprites.create(SubImages.CURSOR_MAGENTA, player.x, player.y, -2);
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

const DEAD_ZONE = 0.2;
const DEAD_ZONE_SQ = 0.04;
const MAGIC_NUMBER = 0.6;

//const FORCE_BIG = 0.35555555555555557;
const FORCE_BIG = 0.35;
//const FORCE = 0.11851851851851852;
const FORCE = 0.1;
//const FORCE_SMALL = 0.05925925925925926;
const FORCE_SMALL = 0.05;

export function handleInput() {
    for (const gamepad of Gamepads.gamepads) {
        const info = Gamepads.info.get(gamepad);
        const newReading = gamepad.getCurrentReading();

        if (newReading.leftThumbstickX <= 0) {
            Sprites.setZ(9, 1.0);
        } else {
            Sprites.setZ(9, -4.5);
        }
        const xAxis = Math.floor(Math.abs(newReading.leftThumbstickX * 100));
        Sprites.setSubImage(10, FontSubImage.get(Math.floor(xAxis / 100)));
        Sprites.setSubImage(12, FontSubImage.get(Math.floor(xAxis / 10) % 10));
        Sprites.setSubImage(13, FontSubImage.get(xAxis % 100 % 10));

        if (newReading.leftThumbstickY <= 0) {
            Sprites.setZ(14, 1.0);
        } else {
            Sprites.setZ(14, -4.5);
        }
        const yAxis = Math.floor(Math.abs(newReading.leftThumbstickY * 100));
        Sprites.setSubImage(15, FontSubImage.get(Math.floor(yAxis / 100)));
        Sprites.setSubImage(17, FontSubImage.get(Math.floor(yAxis / 10) % 10));
        Sprites.setSubImage(18, FontSubImage.get(yAxis % 100 % 10));

        if (Gamepads.buttonPressed(newReading, info.oldReading, GamepadButtons.a)) {
            console.log(`a gamepad pressed A button`);
            //Gamepads.vibrate(gamepad, info, heartBeatFrames);

        } else if (Gamepads.buttonReleased(newReading, info.oldReading, GamepadButtons.a)) {
            console.log(`a gamepad released A button`);
        }

        if (Gamepads.buttonPressed(newReading, info.oldReading, GamepadButtons.y)) {
            //signIn(gamepad);
        }

        {
            {
                const magnitudeSq = newReading.leftThumbstickX * newReading.leftThumbstickX + newReading.leftThumbstickY * newReading.leftThumbstickY;
                if (magnitudeSq < DEAD_ZONE_SQ) {
                    //player.forceX = 0;
                    //player.forceY = 0;
                    //player.magnitudeSq = 0;
                    //player.changed = true;

                    {
                        const magnitudeSq = newReading.rightThumbstickX * newReading.rightThumbstickX + newReading.rightThumbstickY * newReading.rightThumbstickY;
                        if (magnitudeSq < DEAD_ZONE_SQ) {
                            player.forceX = 0;
                            player.forceY = 0;
                            player.magnitudeSq = 0;
                            player.changed = true;
                        } else {
                            player.forceX = newReading.rightThumbstickX / magnitudeSq * ((magnitudeSq - DEAD_ZONE_SQ) / (1 - DEAD_ZONE_SQ));
                            player.forceY = newReading.rightThumbstickY / magnitudeSq * ((magnitudeSq - DEAD_ZONE_SQ) / (1 - DEAD_ZONE_SQ));
                            player.magnitudeSq = magnitudeSq;
                            player.changed = true;
                        }
                    }

                } else {
                    player.forceX = newReading.leftThumbstickX / magnitudeSq * ((magnitudeSq - DEAD_ZONE_SQ) / (1 - DEAD_ZONE_SQ));
                    player.forceY = newReading.leftThumbstickY / magnitudeSq * ((magnitudeSq - DEAD_ZONE_SQ) / (1 - DEAD_ZONE_SQ));
                    player.magnitudeSq = magnitudeSq;
                    player.changed = true;
                }

                if (player.forceX <= 0) {
                    Sprites.setZ(19, 1.0);
                } else {
                    Sprites.setZ(19, -4.5);
                }
                const fX = Math.floor(Math.abs(player.forceX * 100));
                Sprites.setSubImage(20, FontSubImage.get(Math.floor(fX / 100)));
                Sprites.setSubImage(22, FontSubImage.get(Math.floor(fX / 10) % 10));
                Sprites.setSubImage(23, FontSubImage.get(fX % 100 % 10));

                if (player.forceY <= 0) {
                    Sprites.setZ(24, 1.0);
                } else {
                    Sprites.setZ(24, -4.5);
                }
                const fY = Math.floor(Math.abs(player.forceY * 100));
                Sprites.setSubImage(25, FontSubImage.get(Math.floor(fY / 100)));
                Sprites.setSubImage(27, FontSubImage.get(Math.floor(fY / 10) % 10));
                Sprites.setSubImage(28, FontSubImage.get(fY % 100 % 10));
            }
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

        if (player.changed) {
            player.changed = false;

            if ((newReading.buttons & GamepadButtons.leftShoulder) == GamepadButtons.leftShoulder ||
                (newReading.buttons & GamepadButtons.rightShoulder) == GamepadButtons.rightShoulder) {
                player.x += player.forceX * FORCE_BIG;
                player.y += player.forceY * FORCE_BIG;

            } else {
                if (player.magnitudeSq < MAGIC_NUMBER) {
                    player.x += player.forceX * FORCE_SMALL;
                    player.y += player.forceY * FORCE_SMALL;

                } else {
                    player.x += player.forceX * FORCE;
                    player.y += player.forceY * FORCE;
                }
            }

            if (player.x < CursorBorder.LEFT) {
                player.x = CursorBorder.LEFT;
            } else if (player.x > CursorBorder.RIGHT) {
                player.x = CursorBorder.RIGHT;
            }

            if (player.y < CursorBorder.BOTTOM) {
                player.y = CursorBorder.BOTTOM;
            } else if (player.y > CursorBorder.TOP) {
                player.y = CursorBorder.TOP;
            }

            Sprites.setX(cursorIdx, player.x);
            Sprites.setY(cursorIdx, player.y);
        }

        info.oldReading = newReading;
    }
}
