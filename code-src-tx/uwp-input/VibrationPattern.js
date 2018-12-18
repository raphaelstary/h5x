export default class VibrationPattern {
    /**
     *
     * @param {ReadonlyArray<VibrationFrame>} [frames] all vibration key frames
     * @param {number} [currentFrame=0] current key frame index
     * @param {number} [nextTimeFrame=0] next global time frame {@see frame} to trigger next key frame
     */
    constructor(frames, currentFrame = 0, nextTimeFrame = 0) {
        /** @type {ReadonlyArray<VibrationFrame>} */
        this.frames = frames;
        /** @type {number} */
        this.currentFrame = currentFrame;
        /** @type {number} */
        this.nextTimeFrame = nextTimeFrame;

        Object.seal(this);
    }
}
