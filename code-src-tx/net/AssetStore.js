export default class AssetStore {
    constructor(baseSubImages, spriteDimensions, audioSegments, audioBuffer) {
        this.baseSubImages = baseSubImages;
        this.spriteDimensions = spriteDimensions;
        this.audioSegments = audioSegments;
        this.audioBuffer = audioBuffer;

        this.avatarSubImages = new Map();

        Object.seal(this);
    }
}
