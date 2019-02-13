import { assetStore } from '../render/setupWebGL.js';

// thanks apple
const WebAudioContext = window.AudioContext || window.webkitAudioContext;

const ctx = new WebAudioContext();
const volume = ctx.createGain();
volume.connect(ctx.destination);
volume.gain.setValueAtTime(1, ctx.currentTime);


const Audio = Object.freeze({
    ctx,
    volume,

    /**
     *
     * @param {number} audioId segment to play {@see SFXSegment}
     * @param {boolean} [loop=false] if {TRUE} segment loops
     * @param {number} [delay=0] delay in seconds
     * @param {function} [callback] function gets called after finished
     * @returns {AudioBufferSourceNode} created audio node
     */
    playSound: function playSound(audioId, loop, delay, callback) {
        const offset = assetStore.audioSegments[audioId * 2];
        const duration = assetStore.audioSegments[audioId * 2 + 1];

        const source = this.ctx.createBufferSource();

        if (callback) {
            source.onended = callback;
        }

        source.buffer = assetStore.audioBuffer;
        source.connect(volume);

        const when = delay == undefined ? 0 : delay;

        if (loop) {
            source.loop = true;
            source.loopStart = offset;
            source.loopEnd = offset + duration;

            source.start(when, offset);

        } else {
            source.start(when, offset, duration);
        }

        return source;
    }
});

export default Audio;
