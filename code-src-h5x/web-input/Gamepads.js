import * as DOMGamepadButton from './DOMGamepadButton.js';
import * as DOMGamepadAxis from './DOMGamepadAxis.js';
import * as WinRTGamepadButtonFlag from './WinRTGamepadButtonFlag.js';

const Gamepads = Object.freeze({
    /** @type {Map<number, DOMGamepadContainer>} */
    gamepads: new Map(),

    /**
     * @param {Gamepad} gamepad DOM gamepad
     * @param {DOMGamepadReading} outReading reading ouput
     */
    parseDOMGamepadState(gamepad, outReading) {
        let btnFlags = 0;

        if (gamepad.buttons[DOMGamepadButton.A].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.a;
        }
        if (gamepad.buttons[DOMGamepadButton.B].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.b;
        }
        if (gamepad.buttons[DOMGamepadButton.X].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.x;
        }
        if (gamepad.buttons[DOMGamepadButton.Y].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.y;
        }
        if (gamepad.buttons[DOMGamepadButton.LEFT_BUMPER].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.leftShoulder;
        }
        if (gamepad.buttons[DOMGamepadButton.RIGHT_BUMPER].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.rightShoulder;
        }
        if (gamepad.buttons[DOMGamepadButton.VIEW].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.view;
        }
        if (gamepad.buttons[DOMGamepadButton.MENU].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.menu;
        }
        if (gamepad.buttons[DOMGamepadButton.LEFT_STICK].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.leftThumbstick;
        }
        if (gamepad.buttons[DOMGamepadButton.RIGHT_STICK].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.rightThumbstick;
        }
        if (gamepad.buttons[DOMGamepadButton.D_PAD_UP].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.dPadUp;
        }
        if (gamepad.buttons[DOMGamepadButton.D_PAD_DOWN].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.dPadDown;
        }
        if (gamepad.buttons[DOMGamepadButton.D_PAD_LEFT].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.dPadLeft;
        }
        if (gamepad.buttons[DOMGamepadButton.D_PAD_RIGHT].pressed) {
            btnFlags |= WinRTGamepadButtonFlag.dPadRight;
        }

        outReading.buttons = btnFlags;

        outReading.leftThumbstickX = gamepad.axes[DOMGamepadAxis.LEFT_STICK_X];
        outReading.leftThumbstickY = gamepad.axes[DOMGamepadAxis.LEFT_STICK_X];
        outReading.rightThumbstickX = gamepad.axes[DOMGamepadAxis.RIGHT_STICK_X];
        outReading.rightThumbstickY = gamepad.axes[DOMGamepadAxis.RIGHT_STICK_Y];

        outReading.leftTrigger = gamepad.buttons[DOMGamepadButton.LEFT_TRIGGER].value;
        outReading.rightTrigger = gamepad.buttons[DOMGamepadButton.RIGHT_TRIGGER].value;

        outReading.timestamp = gamepad.timestamp;
    }
    ,
    copyReading(inReading, outReading) {
        outReading.buttons = inReading.buttons;

        outReading.leftThumbstickX = inReading.leftThumbstickX;
        outReading.leftThumbstickY = inReading.leftThumbstickY;
        outReading.rightThumbstickX = inReading.rightThumbstickX;
        outReading.rightThumbstickY = inReading.rightThumbstickY;

        outReading.leftTrigger = inReading.leftTrigger;
        outReading.rightTrigger = inReading.rightTrigger;

        outReading.timestamp = inReading.timestamp;
    }
    ,
    /**
     * @param {DOMGamepadReading} currentReading current gamepad reading
     * @param {DOMGamepadReading} previousReading last gamepad reading
     * @param {WinRTGamepadButtonFlag} flag single button
     * @returns {boolean} {TRUE} if button was pressed
     */
    buttonPressed(currentReading, previousReading, flag) {
        return (currentReading.buttons & flag) == flag &&
            (previousReading.buttons & flag) == WinRTGamepadButtonFlag.none;
    }
    ,
    /**
     * @param {DOMGamepadReading} currentReading current gamepad reading
     * @param {DOMGamepadReading} previousReading last gamepad reading
     * @param {WinRTGamepadButtonFlag} flag single button
     * @returns {boolean} {TRUE} if button was released
     */
    buttonReleased(currentReading, previousReading, flag) {
        return (currentReading.buttons & flag) == WinRTGamepadButtonFlag.none &&
            (previousReading.buttons & flag) == flag;
    }
});

export default Gamepads;
