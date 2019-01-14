export default class GamepadVibration {
    /**
     * @param {number} leftMotor normalized [0,1] value for level of left vibration motor
     * @param {number} leftTrigger normalized [0,1] value for level of left trigger vibration motor
     * @param {number} rightMotor normalized [0,1] value for level of right vibration motor
     * @param {number} rightTrigger normalized [0,1] value for level of right trigger vibration motor
     */
    constructor(leftMotor, leftTrigger, rightMotor, rightTrigger) {
        /** @type {number} */
        this.leftMotor = leftMotor;
        /** @type {number} */
        this.leftTrigger = leftTrigger;
        /** @type {number} */
        this.rightMotor = rightMotor;
        /** @type {number} */
        this.rightTrigger = rightTrigger;

        Object.freeze(this);
    }
}
