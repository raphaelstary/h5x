import { renderStore as $ } from './setupWebGL.js';
import { CAMERA_CHANGED, POS_CHANGED, COLORS_CHANGED, XFORMS_CHANGED, DIM_CHANGED, SUB_IMG_CHANGED, NO_CHANGES } from './constants/ChangeFlag.js';
import Sprites from './Sprites.js';

export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;

        this.rotation = 0;

        Object.seal(this);
    }
}

/**
 *
 * @param {Array<Camera>} cameras all current split screen window cameras
 */
export default function drawSplitScreenFrame(cameras) {
    //if ($.changeFlags & CAMERA_CHANGED) {
    //    $.gl.uniformMatrix4fv($.viewLocation, false, $.viewMatrix);
    //}

    if ($.changeFlags & POS_CHANGED) {
        $.gl.bindBuffer($.gl.ARRAY_BUFFER, $.positionBuffer);
        $.gl.bufferSubData($.gl.ARRAY_BUFFER, 0, $.positions);
    }
    if ($.changeFlags & COLORS_CHANGED) {
        $.gl.bindBuffer($.gl.ARRAY_BUFFER, $.colorBuffer);
        $.gl.bufferSubData($.gl.ARRAY_BUFFER, 0, $.colors);
    }
    if ($.changeFlags & XFORMS_CHANGED) {
        $.gl.bindBuffer($.gl.ARRAY_BUFFER, $.xformsBuffer);
        $.gl.bufferSubData($.gl.ARRAY_BUFFER, 0, $.xforms);
    }
    if ($.changeFlags & DIM_CHANGED) {
        $.gl.bindBuffer($.gl.ARRAY_BUFFER, $.dimensionsBuffer);
        $.gl.bufferSubData($.gl.ARRAY_BUFFER, 0, $.dimensions);
    }
    if ($.changeFlags & SUB_IMG_CHANGED) {
        $.gl.bindBuffer($.gl.ARRAY_BUFFER, $.subImageBuffer);
        $.gl.bufferSubData($.gl.ARRAY_BUFFER, 0, $.subImages);
    }
    $.changeFlags = NO_CHANGES;

    $.gl.viewport(0, 0, $.gl.drawingBufferWidth, $.gl.drawingBufferHeight);

    $.gl.clearColor(5 / 255, 109 / 255, 207 / 255, 0.0);
    $.gl.clearDepth(1.0);
    $.gl.clear($.gl.COLOR_BUFFER_BIT | $.gl.DEPTH_BUFFER_BIT);

    const rowsAndCols = Math.ceil(Math.sqrt(cameras.length));
    const width = $.gl.drawingBufferWidth / rowsAndCols;
    const height = $.gl.drawingBufferHeight / rowsAndCols;

    for (let i = 0; i < cameras.length; i++) {
        const camera = cameras[i];

        $.gl.viewport(i % rowsAndCols * width, Math.trunc(i / rowsAndCols) * height, width, height);

        $.gl.uniformMatrix4fv($.viewLocation, false, $.viewMatrix);

        $.ext.drawArraysInstancedANGLE($.gl.TRIANGLE_STRIP, 0, 4, Sprites.maxIdx + 1);
    }
}
