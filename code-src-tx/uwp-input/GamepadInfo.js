export default class GamepadInfo {
    /**
     * @param {Windows.Gaming.Input.GamepadReading} oldReading last reading
     * @param {boolean} isVibrating {TRUE} if vibration is set & ongoing
     * @param {VibrationPattern} vibration current vibration pattern
     */
    constructor(oldReading, isVibrating, vibration) {
        /** @type {Windows.Gaming.Input.GamepadReading} */
        this.oldReading = oldReading;
        /** @type {boolean} */
        this.isVibrating = isVibrating;
        /** @type {VibrationPattern} */
        this.vibration = vibration;

        Object.seal(this);
    }
}
