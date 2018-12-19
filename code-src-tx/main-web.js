import loadAssets from './net/loadAssets.js';
import {processAssets} from './render/setupWebGL.js';
import eventLoop from './app/eventLoop.js';
import handleInput from './web/handleGamepads.js';
import runMyScenes from './web/runMyScenes.js';
import './web-input/setupGamepadHandling.js';

loadAssets.then(processAssets).then(() => {
    eventLoop(handleInput);
    runMyScenes();

    Promise.all(
        [
            'https://www.gravatar.com/avatar/d2e80a9d1c6e3a794bcfabe93b32a572',
            'https://www.gravatar.com/avatar/24aae591d78a51f98e461186173ef3e9',
            'https://www.gravatar.com/avatar/b4466a237baa1c4accab612d746e3ba9',
            'https://www.gravatar.com/avatar/081b29f0c6df111eb15a95c8a89f0049'
        ]
            .map(url =>
                fetch(url)
                    .then(response => {
                        if (response.ok)
                            return response.blob();
                        throw new Error('could not fetch avatar from ' + url);
                    })
                    .then(blob => {
                        return new Promise(resolve => {
                            const img = new Image();
                            img.onload = () => resolve(img);
                            img.src = URL.createObjectURL(blob);
                        });
                    }))
    )
        .then(imgs => {
            const height = Math.max(...imgs.map(img => img.height));
            const width = imgs.reduce((totalWidth, img) => totalWidth + img.width, 0);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            let offsetX = 0;
            imgs.forEach(img => {
                ctx.drawImage(img, offsetX, 0);
                offsetX += img.width;
            });
        });
});
