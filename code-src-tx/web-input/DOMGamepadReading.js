export default class DOMGamepadReading {
    /**
     * @param {number} buttons set bitflags for pressed buttons, for flags {@see WinRTGamepadButtonFlag}
     * @param {number} leftStickX normalized [-1, 1] value for left stick X axis
     * @param {number} leftStickY normalized [-1, 1] value for left stick Y axis
     * @param {number} leftTrigger normalized [0, 1] value for left trigger
     * @param {number} rightStickX normalized [-1, 1] value for right stick X axis
     * @param {number} rightStickY normalized [-1, 1] value for right stick Y axis
     * @param {number} rightTrigger normalized [0, 1] value for left trigger
     * @param {number} timestamp time of reading
     */
    constructor(buttons, leftStickX, leftStickY, leftTrigger, rightStickX, rightStickY, rightTrigger, timestamp) {
        this.buttons = buttons;
        this.leftThumbstickX = leftStickX;
        this.leftThumbstickY = leftStickY;
        this.leftTrigger = leftTrigger;
        this.rightThumbstickX = rightStickX;
        this.rightThumbstickY = rightStickY;
        this.rightTrigger = rightTrigger;
        this.timestamp = timestamp;

        Object.seal(this);
    }
}
