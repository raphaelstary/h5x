import loadAssets from './net/loadAssets.js';
import {processAssets} from './render/setupWebGL.js';
import eventLoop from './app/eventLoop.js';
import handleInput from './web/handleGamepads.js';
import runMyScenes from './web/runMyScenes.js';
import './web-input/setupGamepadHandling.js';


loadAssets.then(processAssets).then(() => {
    eventLoop(handleInput);

    runMyScenes();
});
