import GamepadVibration from './GamepadVibration.js';

export const NONE = new GamepadVibration(0, 0, 0, 0),
    LEFT_TRIGGER_HALF = new GamepadVibration(0, 0.5, 0, 0),
    RIGHT_TRIGGER_HALF = new GamepadVibration(0, 0, 0, 0.5);
