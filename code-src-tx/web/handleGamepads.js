import Gamepads from '../web-input/Gamepads.js';
import * as WinRTGamepadButtonFlag from '../web-input/WinRTGamepadButtonFlag.js';

export default function handleGamepads() {
    navigator.getGamepads(); // fetch new input reading (objects get updated for no reason, there should be no ref)

    for (let container of Gamepads.gamepads.values()) {

        Gamepads.parseDOMGamepadState(container.gamepad, container.newReading);

        if (Gamepads.buttonPressed(container.newReading, container.oldReading, WinRTGamepadButtonFlag.a)) {
            console.log(`gamepad ${container.gamepad.index} pressed A button`);

        } else if (Gamepads.buttonReleased(container.newReading, container.oldReading, WinRTGamepadButtonFlag.a)) {
            console.log(`gamepad ${container.gamepad.index} released A button`);
        }

        Gamepads.copyReading(container.newReading, container.oldReading);
    }

}
