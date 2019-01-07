import loadAssets from './net/loadAssets.js';
import { processAssets } from './render/setupWebGL.js';
import eventLoop from './app/eventLoop.js';
import handleInput from './web/handleGamepads.js';
import runMyScenes from './web/runMyScenes.js';
import './web-input/setupGamepadHandling.js';
import Sprites from './render/Sprites.js';


loadAssets.then(processAssets).then(() => {
    // where to put those lines ... ?
    const fpsTxt = Sprites.createDebugText('00 fps', 7.5, -4.2, -4.5);
    const msTxt = Sprites.createDebugText('00  ms', 7.5, -4.4, -4.5);

    eventLoop(handleInput);
    runMyScenes();
});
