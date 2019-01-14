import Gamepads from './Gamepads.js';
import DOMGamepadContainer from './DOMGamepadContainer.js';

const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
if (isChrome) {
    const gamepadSlots = navigator.getGamepads();
    for (let i = 0; i < gamepadSlots.length; i++) {
        const gamepad = gamepadSlots[i];
        if (gamepad && gamepad.mapping == 'standard')
            Gamepads.gamepads.set(gamepad.index, new DOMGamepadContainer(gamepad));
    }
}

window.addEventListener('gamepadconnected', event => {
    if (isChrome && event.gamepad.mapping != 'standard')
        return;

    console.log(`gamepad connected: ${event.gamepad.index}`);
    Gamepads.gamepads.set(event.gamepad.index, new DOMGamepadContainer(event.gamepad));
});

window.addEventListener('gamepaddisconnected', event => {
    console.log(`gamepad disconnected: ${event.gamepad.index}`);
    Gamepads.gamepads.delete(event.gamepad.index);
});

console.log(`gamepad slots available: ${navigator.getGamepads().length}`);