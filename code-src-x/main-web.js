import loadAssets from '../code-src-h5x/net/loadAssets.js';
import { processAssets } from '../code-src-h5x/render/setupWebGL.js';
import eventLoop from '../code-src-h5x/app/eventLoop.js';
import handleInput from '../code-src-h5x/web/handleGamepads.js';
import runMyScenes from './web-scenes/runMyScenes.js';
import '../code-src-h5x/web-input/setupGamepadHandling.js';
import Sprites from '../code-src-h5x/render/Sprites.js';


loadAssets.then(processAssets).then(() => {
    // where to put those lines ... ?
    const fpsTxt = Sprites.createDebugText('00 fps', 7.5, -4.2, -4.5);
    const msTxt = Sprites.createDebugText('00  ms', 7.5, -4.4, -4.5);

    eventLoop(handleInput);
    runMyScenes();
});
