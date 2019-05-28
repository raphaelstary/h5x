import { renderStore as $ } from './setupWebGL.js';
import { CAMERA_CHANGED, POS_CHANGED, COLORS_CHANGED, XFORMS_CHANGED, DIM_CHANGED, SUB_IMG_CHANGED, NO_CHANGES } from './constants/ChangeFlag.js';
import Sprites from './Sprites.js';

export default function drawFrame() {
    if ($.changeFlags & CAMERA_CHANGED) {
        $.gl.uniformMatrix4fv($.viewLocation, false, $.viewMatrix);
    }
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
    $.gl.clearColor(5 / 255, 109 / 255, 207 / 255, 0.0);
    $.gl.clearDepth(1.0);
    $.gl.clear($.gl.COLOR_BUFFER_BIT | $.gl.DEPTH_BUFFER_BIT);
    $.ext.drawArraysInstancedANGLE($.gl.TRIANGLE_STRIP, 0, 4, Sprites.maxIdx + 1);
}
