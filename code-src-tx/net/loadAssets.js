import Audio from '../audio/Audio.js';

export default Promise.all([

    new Promise(resolve => window.onload = resolve),

    fetch('../asset-gen/sub-images.h5')
        .then(response => {
            if (response.ok)
                return response.arrayBuffer();

            throw new Error('could not fetch sub-image-data');
        }),

    fetch('../asset-gen/atlas_0.png')
        .then(response => {
            if (response.ok)
                return response.blob();

            throw new Error('could not fetch texture-atlas');
        })
        .then(blob => {
            console.log(`texture atlas file size: ${(blob.size / 1024 / 1024).toFixed(2)} mb`);

            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = URL.createObjectURL(blob);
            });
        }),

    fetch('../asset-gen/atlas_1.png')
        .then(response => {
            if (response.ok)
                return response.blob();

            throw new Error('could not fetch texture-atlas');
        })
        .then(blob => {
            console.log(`texture atlas file size: ${(blob.size / 1024 / 1024).toFixed(2)} mb`);

            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = URL.createObjectURL(blob);
            });
        }),

    fetch('../asset-gen/sprite-dimensions.h5')
        .then(response => {
            if (response.ok)
                return response.arrayBuffer();

            throw new Error('could not fetch sprite-dimension-data');
        }),

    fetch('../asset-gen/sfx-segments.h5')
        .then(response => {
            if (response.ok)
                return response.arrayBuffer();

            throw new Error('could not fetch sfx audio-segment-data');
        }),

    fetch('../asset-gen/sfx.wav')
        .then(response => {
            if (response.ok)
                return response.arrayBuffer();

            throw new Error('could not fetch sfx audio-sprite');
        })
        .then(
            /**
             * @param {Response | ArrayBuffer} buffer audio array buffer
             * @returns {Promise<AudioBuffer>} decoded audio data
             */
            buffer => {
                console.log(`encoded audio buffer size: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} mb`);
                return Audio.ctx.decodeAudioData(buffer);
            })
])
    .catch(error => console.log(error));

/**
 * @param {{name: string, url: string}[]} urls
 * @returns {Promise<{name: string, img: Image}[]>}
 */
export function loadAvatars(urls) {
    return Promise.all(urls
        .map(({name, url}) =>
            fetch(url)
                .then(response => {
                    if (response.ok)
                        return response.blob();
                    throw new Error('could not fetch avatar from ' + url);
                })
                .then(blob => {
                    return new Promise(resolve => {
                        const img = new Image();
                        img.onload = () => resolve({name, img});
                        img.src = URL.createObjectURL(blob);
                    });
                }))
    );
}
