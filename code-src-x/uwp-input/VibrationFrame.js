export default class VibrationFrame {
    /**
     * @param {GamepadVibration} vibration gamepad vibration value object
     * @param {number} duration duration, how long vibration lasts - in elapsed {@see window.requestAnimationFrames}
     */
    constructor(vibration, duration) {
        /** @type {GamepadVibration} */
        this.vibration = vibration;
        /** @type {number} */
        this.duration = duration;

        Object.freeze(this);
    }
}
