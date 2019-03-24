import { renderStore as $ } from '../render/setupWebGL.js';

const Gamepads = Object.freeze({
    /** @type {Set<Windows.Gaming.Input.Gamepad>} */
    gamepads: new Set(),
    /** @type {WeakMap<Windows.Gaming.Input.Gamepad, GamepadInfo>} */
    info: new WeakMap(),

    /**
     * @param {Windows.Gaming.Input.GamepadReading} currentReading current reading
     * @param {Windows.Gaming.Input.GamepadReading} previousReading last reading
     * @param {Windows.Gaming.Input.GamepadButtons} flag single button
     * @returns {boolean} {TRUE} if button was pressed
     */
    buttonPressed(currentReading, previousReading, flag) {
        return (currentReading.buttons & flag) == flag &&
            (previousReading.buttons & flag) == Windows.Gaming.Input.GamepadButtons.none;
    },

    /**
     * @param {Windows.Gaming.Input.GamepadReading} currentReading current reading
     * @param {Windows.Gaming.Input.GamepadReading} previousReading last reading
     * @param {Windows.Gaming.Input.GamepadButtons} flag single button
     * @returns {boolean} {TRUE} if button was released
     */
    buttonReleased(currentReading, previousReading, flag) {
        return (currentReading.buttons & flag) == Windows.Gaming.Input.GamepadButtons.none &&
            (previousReading.buttons & flag) == flag;
    },

    /**
     *
     * @param {Windows.Gaming.Input.Gamepad} gamepad gamepad to vibrate
     * @param {GamepadInfo} info gamepad info wrapper
     * @param {ReadonlyArray<VibrationFrame>} frames vibration animation frames
     */
    vibrate(gamepad, info, frames) {
        info.vibration.frames = frames;
        info.vibration.currentFrame = 0;
        info.vibration.nextTimeFrame = $.frame + frames[0].duration;
        info.isVibrating = true;

        gamepad.vibration = frames[0].vibration;
    }
});

export default Gamepads;
