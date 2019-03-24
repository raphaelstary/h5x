import DOMGamepadReading from './DOMGamepadReading.js';

export default class DOMGamepadContainer {
    /**
     * @param {Gamepad} gamepad DOM gamepad
     */
    constructor(gamepad) {
        this.gamepad = gamepad;
        this.oldReading = new DOMGamepadReading();
        this.newReading = new DOMGamepadReading();

        Object.seal(this);
    }
}
