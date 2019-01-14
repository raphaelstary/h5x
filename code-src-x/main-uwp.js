import eventLoop from '../code-src-h5x/app/eventLoop.js';
import loadAssets from '../code-src-h5x/net/loadAssets.js';
import runMyScenes, { handleInput } from './uwp-scenes/runMyScenes.js';
import { processAssets } from '../code-src-h5x/render/setupWebGL.js';
import '../code-src-h5x/uwp/setupUWP.js';
import Sprites from '../code-src-h5x/render/Sprites.js';

loadAssets.then(processAssets).then(() => {

    // where to put those lines ... ?
    const fpsTxt = Sprites.createDebugText('00 fps', 7.0, -4.2, -4.5);
    const msTxt = Sprites.createDebugText('00  ms', 7.0, -4.4, -4.5);

    const leftThumbX = Sprites.createDebugText('n0.00', 7.5, -3.6, -4.5);
    const leftThumbY = Sprites.createDebugText('n0.00', 7.5, -3.8, -4.5);

    const forceX = Sprites.createDebugText('n0.00', 7.5, -3.0, -4.5);
    const forceY = Sprites.createDebugText('n0.00', 7.5, -3.2, -4.5);

    const fpsMin = Sprites.createDebugText('00 min', 7.5, -4.2, -4.5);
    const msMax = Sprites.createDebugText('00 max', 7.5, -4.4, -4.5);

    eventLoop(handleInput);
    runMyScenes();
});
