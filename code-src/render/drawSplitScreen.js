import { hudRenderStore as hud, renderStore as $ } from './setupWebGL.js';
import { CAMERA_CHANGED, POS_CHANGED, COLORS_CHANGED, XFORMS_CHANGED, DIM_CHANGED, SUB_IMG_CHANGED, NO_CHANGES } from './constants/ChangeFlag.js';
import Sprites from './Sprites.js';
import { POS_ELEMENTS } from './constants/PosBuffer.js';
import { COLOR_ELEMENTS } from './constants/ColorBuffer.js';
import { XFORMS_ELEMENTS } from './constants/XFormsBuffer.js';
import { DIM_ELEMENTS } from './constants/DimBuffer.js';
import { SUB_IMG_ELEMENTS } from './constants/SubImgBuffer.js';
import HUDSprites from './HUDSprites.js';

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

    $.gl.useProgram($.program);

    $.gl.bindBuffer($.gl.ARRAY_BUFFER, $.positionBuffer);
    if ($.changeFlags & POS_CHANGED) {
        $.gl.bufferSubData($.gl.ARRAY_BUFFER, 0, $.positions);
    }
    const positionLocation = $.gl.getAttribLocation($.program, 'position');
    $.gl.vertexAttribPointer(positionLocation, POS_ELEMENTS, $.gl.FLOAT, false, 0, 0);
    $.gl.enableVertexAttribArray(positionLocation);
    $.ext.vertexAttribDivisorANGLE(positionLocation, 1);


    $.gl.bindBuffer($.gl.ARRAY_BUFFER, $.colorBuffer);
    if ($.changeFlags & COLORS_CHANGED) {
        $.gl.bufferSubData($.gl.ARRAY_BUFFER, 0, $.colors);
    }
    const colorLocation = $.gl.getAttribLocation($.program, 'color');
    $.gl.vertexAttribPointer(colorLocation, COLOR_ELEMENTS, $.gl.FLOAT, false, 0, 0);
    $.gl.enableVertexAttribArray(colorLocation);
    $.ext.vertexAttribDivisorANGLE(colorLocation, 1);


    $.gl.bindBuffer($.gl.ARRAY_BUFFER, $.xformsBuffer);
    if ($.changeFlags & XFORMS_CHANGED) {
        $.gl.bufferSubData($.gl.ARRAY_BUFFER, 0, $.xforms);
    }
    const xformsLocation = $.gl.getAttribLocation($.program, 'xforms');
    $.gl.vertexAttribPointer(xformsLocation, XFORMS_ELEMENTS, $.gl.FLOAT, false, 0, 0);
    $.gl.enableVertexAttribArray(xformsLocation);
    $.ext.vertexAttribDivisorANGLE(xformsLocation, 1);

    $.gl.bindBuffer($.gl.ARRAY_BUFFER, $.dimensionsBuffer);
    if ($.changeFlags & DIM_CHANGED) {
        $.gl.bufferSubData($.gl.ARRAY_BUFFER, 0, $.dimensions);
    }
    const dimensionsLocation = $.gl.getAttribLocation($.program, 'dimensions');
    $.gl.vertexAttribPointer(dimensionsLocation, DIM_ELEMENTS, $.gl.FLOAT, false, 0, 0);
    $.gl.enableVertexAttribArray(dimensionsLocation);
    $.ext.vertexAttribDivisorANGLE(dimensionsLocation, 1);

    $.gl.bindBuffer($.gl.ARRAY_BUFFER, $.subImageBuffer);
    if ($.changeFlags & SUB_IMG_CHANGED) {
        $.gl.bufferSubData($.gl.ARRAY_BUFFER, 0, $.subImages);
    }
    const subImageLocation = $.gl.getAttribLocation($.program, 'subImage');
    $.gl.vertexAttribPointer(subImageLocation, SUB_IMG_ELEMENTS, $.gl.FLOAT, false, 0, 0);
    $.gl.enableVertexAttribArray(subImageLocation);
    $.ext.vertexAttribDivisorANGLE(subImageLocation, 1);


    $.changeFlags = NO_CHANGES;

    $.gl.clear($.gl.COLOR_BUFFER_BIT | $.gl.DEPTH_BUFFER_BIT);

    const screenWidth = $.gl.drawingBufferWidth;
    const screenHeight = $.gl.drawingBufferHeight;
    const rowsAndCols = Math.ceil(Math.sqrt(cameras.length));
    const width = screenWidth / rowsAndCols;
    const height = screenHeight / rowsAndCols;

    for (let i = 0; i < cameras.length; i++) {
        const camera = cameras[i];

        const vx = i % rowsAndCols * width;
        const vy = Math.trunc(i / rowsAndCols) * height;
        $.gl.viewport(vx, screenHeight - vy - height, width - 1, height - 1);

        const {x, y, z, rotation} = camera;

        if (rotation == 0) {
            $.viewMatrix[0] = 1.0;
            $.viewMatrix[1] = 0.0;
            $.viewMatrix[4] = 0.0;
            $.viewMatrix[5] = 1.0;

            $.viewMatrix[12] = -x;
            $.viewMatrix[13] = -y;
            $.viewMatrix[14] = -z;

        } else if (rotation == 90) {
            $.viewMatrix[0] = 0.0;
            $.viewMatrix[1] = 1.0;
            $.viewMatrix[4] = -1.0;
            $.viewMatrix[5] = 0.0;

            $.viewMatrix[12] = y;
            $.viewMatrix[13] = -x;
            $.viewMatrix[14] = -z;

        } else if (rotation == 180) {
            $.viewMatrix[0] = -1.0;
            $.viewMatrix[1] = 0.0;
            $.viewMatrix[4] = 0.0;
            $.viewMatrix[5] = -1.0;

            $.viewMatrix[12] = x;
            $.viewMatrix[13] = y;
            $.viewMatrix[14] = -z;

        } else if (rotation == 270) {
            $.viewMatrix[0] = 0.0;
            $.viewMatrix[1] = -1.0;
            $.viewMatrix[4] = 1.0;
            $.viewMatrix[5] = 0.0;

            $.viewMatrix[12] = -y;
            $.viewMatrix[13] = x;
            $.viewMatrix[14] = -z;

        } else {

            const angle = rotation * Math.PI / 180 * -1;
            const cz = Math.cos(angle);
            const sz = Math.sin(angle);

            const det = 1.0 / (cz * cz - sz * -sz);

            $.viewMatrix[0] = cz * det;
            $.viewMatrix[1] = -sz * det;
            $.viewMatrix[4] = sz * det;
            $.viewMatrix[5] = cz * det;
            $.viewMatrix[12] = (cz * -x + sz * -y) * det;
            $.viewMatrix[13] = (cz * -y - sz * -x) * det;
        }

        $.gl.uniformMatrix4fv($.viewLocation, false, $.viewMatrix);

        $.ext.drawArraysInstancedANGLE($.gl.TRIANGLE_STRIP, 0, 4, Sprites.maxIdx + 1);
    }


    // ###############################################################################################

    $.gl.viewport(0, 0, screenWidth, screenHeight);

    hud.gl.useProgram(hud.program);

    if (hud.changeFlags & CAMERA_CHANGED) {
        hud.gl.uniformMatrix4fv(hud.viewLocation, false, hud.viewMatrix);
    }

    hud.gl.bindBuffer(hud.gl.ARRAY_BUFFER, hud.positionBuffer);
    if (hud.changeFlags & POS_CHANGED) {
        hud.gl.bufferSubData(hud.gl.ARRAY_BUFFER, 0, hud.positions);
    }
    const hudPositionLocation = hud.gl.getAttribLocation(hud.program, 'position');
    hud.gl.vertexAttribPointer(hudPositionLocation, POS_ELEMENTS, hud.gl.FLOAT, false, 0, 0);
    hud.gl.enableVertexAttribArray(hudPositionLocation);
    hud.ext.vertexAttribDivisorANGLE(hudPositionLocation, 1);


    hud.gl.bindBuffer(hud.gl.ARRAY_BUFFER, hud.colorBuffer);
    if (hud.changeFlags & COLORS_CHANGED) {
        hud.gl.bufferSubData(hud.gl.ARRAY_BUFFER, 0, hud.colors);
    }
    const hudColorLocation = hud.gl.getAttribLocation(hud.program, 'color');
    hud.gl.vertexAttribPointer(hudColorLocation, COLOR_ELEMENTS, hud.gl.FLOAT, false, 0, 0);
    hud.gl.enableVertexAttribArray(hudColorLocation);
    hud.ext.vertexAttribDivisorANGLE(hudColorLocation, 1);


    hud.gl.bindBuffer(hud.gl.ARRAY_BUFFER, hud.xformsBuffer);
    if (hud.changeFlags & XFORMS_CHANGED) {
        hud.gl.bufferSubData(hud.gl.ARRAY_BUFFER, 0, hud.xforms);
    }
    const hudXformsLocation = hud.gl.getAttribLocation(hud.program, 'xforms');
    hud.gl.vertexAttribPointer(hudXformsLocation, XFORMS_ELEMENTS, hud.gl.FLOAT, false, 0, 0);
    hud.gl.enableVertexAttribArray(hudXformsLocation);
    hud.ext.vertexAttribDivisorANGLE(hudXformsLocation, 1);

    hud.gl.bindBuffer(hud.gl.ARRAY_BUFFER, hud.dimensionsBuffer);
    if (hud.changeFlags & DIM_CHANGED) {
        hud.gl.bufferSubData(hud.gl.ARRAY_BUFFER, 0, hud.dimensions);
    }
    const hudDimensionsLocation = hud.gl.getAttribLocation(hud.program, 'dimensions');
    hud.gl.vertexAttribPointer(hudDimensionsLocation, DIM_ELEMENTS, hud.gl.FLOAT, false, 0, 0);
    hud.gl.enableVertexAttribArray(hudDimensionsLocation);
    hud.ext.vertexAttribDivisorANGLE(hudDimensionsLocation, 1);

    hud.gl.bindBuffer(hud.gl.ARRAY_BUFFER, hud.subImageBuffer);
    if (hud.changeFlags & SUB_IMG_CHANGED) {
        hud.gl.bufferSubData(hud.gl.ARRAY_BUFFER, 0, hud.subImages);
    }
    const hudSubImageLocation = hud.gl.getAttribLocation(hud.program, 'subImage');
    hud.gl.vertexAttribPointer(hudSubImageLocation, SUB_IMG_ELEMENTS, hud.gl.FLOAT, false, 0, 0);
    hud.gl.enableVertexAttribArray(hudSubImageLocation);
    hud.ext.vertexAttribDivisorANGLE(hudSubImageLocation, 1);


    hud.changeFlags = NO_CHANGES;

    hud.gl.clear(hud.gl.DEPTH_BUFFER_BIT);
    hud.ext.drawArraysInstancedANGLE(hud.gl.TRIANGLE_STRIP, 0, 4, HUDSprites.maxIdx + 1);
}
