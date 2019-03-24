import { POS_ELEMENTS } from './constants/PosBuffer.js';
import { COLOR_ELEMENTS } from './constants/ColorBuffer.js';
import { XFORMS_ELEMENTS } from './constants/XFormsBuffer.js';
import { DIM_ELEMENTS } from './constants/DimBuffer.js';
import { SUB_IMG_ELEMENTS } from './constants/SubImgBuffer.js';

export default class RenderStore {
    constructor(gl, ext, changeFlags, maxElements, frame,
                positionBuffer, colorBuffer, xformsBuffer, dimensionsBuffer, subImageBuffer,
                positionData, colorData, xformsData, dimensionsData, subImageData,
                positions, colors, xforms, dimensions, subImages) {
        this.gl = gl;
        this.ext = ext;

        this.changeFlags = changeFlags;
        this.maxElements = maxElements;

        /**
         * global current time frame based on {@see requestAnimationFrame} frames elapsed since app started
         *
         * @type {number}
         */
        this.frame = frame;

        this.positionBuffer = positionBuffer;
        this.colorBuffer = colorBuffer;
        this.xformsBuffer = xformsBuffer;
        this.dimensionsBuffer = dimensionsBuffer;
        this.subImageBuffer = subImageBuffer;

        this.positionData = positionData;
        this.colorData = colorData;
        this.xformsData = xformsData;
        this.dimensionsData = dimensionsData;
        this.subImageData = subImageData;

        this.positions = positions;
        this.colors = colors;
        this.xforms = xforms;
        this.dimensions = dimensions;
        this.subImages = subImages;

        Object.seal(this);
    }

    resizeTypedViews() {
        this.positions = new Float32Array(this.positionData, 0, this.maxElements * POS_ELEMENTS);
        this.colors = new Float32Array(this.colorData, 0, this.maxElements * COLOR_ELEMENTS);
        this.xforms = new Float32Array(this.xformsData, 0, this.maxElements * XFORMS_ELEMENTS);
        this.dimensions = new Float32Array(this.dimensionsData, 0, this.maxElements * DIM_ELEMENTS);
        this.subImages = new Float32Array(this.subImageData, 0, this.maxElements * SUB_IMG_ELEMENTS);

        const TOTAL_SUB_BUFFER_SIZE = this.positions.byteLength + this.colors.byteLength + this.xforms.byteLength +
            this.dimensions.byteLength + this.subImages.byteLength;
        console.log(`current gpu sub buffer tick update size: ${(TOTAL_SUB_BUFFER_SIZE / 1024).toFixed(2)} kb`);
    }
}
