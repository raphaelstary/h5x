import eventLoop from './app/eventLoop.js';
import loadAssets from './net/loadAssets.js';
import runMyScenes from './uwp/runMyScenes.js';
import {handleInput} from './uwp/setupUWP.js';
import {processAssets} from './render/setupWebGL.js';

loadAssets.then(processAssets).then(() => {
    eventLoop(handleInput);
    runMyScenes();
});
