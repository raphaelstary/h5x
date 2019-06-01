import AssetStore from '../net/AssetStore.js';
import RenderStore from './RenderStore.js';
import { ANIM_COLOR1C_BUFFER_SIZE, ANIM_POS_BUFFER_SIZE, ANIM_POSC_BUFFER_SIZE, ANIM_ROT1D_BUFFER_SIZE, ANIM_SCALE_BUFFER_SIZE } from './constants/AnimationBuffer.js';
import { NO_CHANGES } from './constants/ChangeFlag.js';
import fragmentShaderSrc from './shader/SpriteFragmentShader.js';
import vertexShaderSrc from './shader/SpriteVertexShader.js';
import { POS_BUFFER_SIZE, POS_ELEMENTS } from './constants/PosBuffer.js';
import { COLOR_BUFFER_SIZE, COLOR_ELEMENTS } from './constants/ColorBuffer.js';
import { XFORMS_BUFFER_SIZE, XFORMS_ELEMENTS } from './constants/XFormsBuffer.js';
import { DIM_BUFFER_SIZE, DIM_ELEMENTS } from './constants/DimBuffer.js';
import { SUB_IMG_BUFFER_SIZE, SUB_IMG_ELEMENTS } from './constants/SubImgBuffer.js';
import { ELEMENTS_CHUNK } from './constants/BaseBuffer.js';
import { SPRITES_LENGTH } from './constants/SpriteBuffer.js';

export const assetStore = new AssetStore();

export const WIDTH = 16;
export const HEIGHT = 9;

const canvas = document.getElementById('screen');

const gl = canvas.getContext('webgl', { alpha: false });
const ext = gl.getExtension('ANGLE_instanced_arrays');

console.log('max texture size: ' + gl.getParameter(gl.MAX_TEXTURE_SIZE));
console.log('max tx img units: ' + gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS));
console.log('max VS tx img units: ' + gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS));
console.log('max comb tx img units: ' + gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS));
console.log('max vertex attribs: ' + gl.getParameter(gl.MAX_VERTEX_ATTRIBS));

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.enable(gl.CULL_FACE);


const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSrc);
gl.compileShader(vertexShader);

if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    gl.deleteShader(vertexShader);
}

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSrc);
gl.compileShader(fragmentShader);

if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(fragmentShader));
    gl.deleteShader(fragmentShader);
}

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}


const hudVS = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(hudVS, vertexShaderSrc);
gl.compileShader(hudVS);

if (!gl.getShaderParameter(hudVS, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(hudVS));
    gl.deleteShader(hudVS);
}

const hudFS = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(hudFS, fragmentShaderSrc);
gl.compileShader(hudFS);

if (!gl.getShaderParameter(hudFS, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(hudFS));
    gl.deleteShader(hudFS);
}

const hudProg = gl.createProgram();
gl.attachShader(hudProg, hudVS);
gl.attachShader(hudProg, hudFS);
gl.linkProgram(hudProg);

if (!gl.getProgramParameter(hudProg, gl.LINK_STATUS)) {
    console.log(gl.getProgramInfoLog(hudProg));
    gl.deleteProgram(hudProg);
}


/*
 * VIEW CONSTANTS
 */
const Z_NEAR = 0.1;
const Z_FAR = 10.0;

const viewLocation = gl.getUniformLocation(program, 'view');
const viewMatrix = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
]);
gl.useProgram(program);
gl.uniformMatrix4fv(viewLocation, false, viewMatrix);

const hudViewLoc = gl.getUniformLocation(hudProg, 'view');
const hudViewMat = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    WIDTH / 2, HEIGHT / 2, 0, 1
]);
gl.useProgram(hudProg);
gl.uniformMatrix4fv(hudViewLoc, false, hudViewMat);

const aspect = WIDTH / HEIGHT;
const fov = Math.PI * 0.5;
const f = 1.0 / Math.tan(fov / 2);

const a = f / aspect;
const c = (Z_NEAR + Z_FAR) / (Z_NEAR - Z_FAR);
const tz = 2 * Z_FAR * Z_NEAR / (Z_NEAR - Z_FAR);

const projectionLocation = gl.getUniformLocation(program, 'projection');
gl.useProgram(program);
gl.uniformMatrix4fv(projectionLocation, false, new Float32Array([
    a, 0, 0, 0,
    0, f, 0, 0,
    0, 0, c, -1,
    0, 0, tz, 0
]));


const x = 2 / WIDTH;
const y = 2 / HEIGHT;
const z = -2 / (Z_FAR - Z_NEAR);
const t = -(Z_FAR + Z_NEAR) / (Z_FAR - Z_NEAR);

const hudProjLoc = gl.getUniformLocation(hudProg, 'projection');
gl.useProgram(hudProg);
gl.uniformMatrix4fv(hudProjLoc, false, new Float32Array([
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    -1, -1, t, 1
]));

const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1.0, -1.0, 0.0, 1.0,
    1.0, -1.0, 1.0, 1.0,
    -1.0, 1.0, 0.0, 0.0,
    1.0, 1.0, 1.0, 0.0
]), gl.STATIC_DRAW);

const quadLocation = gl.getAttribLocation(program, 'quad');
gl.vertexAttribPointer(quadLocation, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(quadLocation);
ext.vertexAttribDivisorANGLE(quadLocation, 0);

// const hudQuadLoc = gl.getAttribLocation(hudProg, 'quad');
// gl.vertexAttribPointer(hudQuadLoc, 4, gl.FLOAT, false, 0, 0);
// gl.enableVertexAttribArray(hudQuadLoc);
// ext.vertexAttribDivisorANGLE(hudQuadLoc, 0);


const positionData = new ArrayBuffer(POS_BUFFER_SIZE);
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, POS_BUFFER_SIZE, gl.DYNAMIC_DRAW);

const hudPosData = new ArrayBuffer(POS_BUFFER_SIZE);
const hudPosBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, hudPosBuffer);
gl.bufferData(gl.ARRAY_BUFFER, POS_BUFFER_SIZE, gl.DYNAMIC_DRAW);


const colorData = new ArrayBuffer(COLOR_BUFFER_SIZE);
const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, COLOR_BUFFER_SIZE, gl.DYNAMIC_DRAW);

const hudColorData = new ArrayBuffer(COLOR_BUFFER_SIZE);
const hudColorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, hudColorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, COLOR_BUFFER_SIZE, gl.DYNAMIC_DRAW);


const xformsData = new ArrayBuffer(XFORMS_BUFFER_SIZE);
const xformsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, xformsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, XFORMS_BUFFER_SIZE, gl.DYNAMIC_DRAW);

const hudXformsData = new ArrayBuffer(XFORMS_BUFFER_SIZE);
const hudXformsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, hudXformsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, XFORMS_BUFFER_SIZE, gl.DYNAMIC_DRAW);


const dimensionsData = new ArrayBuffer(DIM_BUFFER_SIZE);
const dimensionsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, dimensionsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, DIM_BUFFER_SIZE, gl.STATIC_DRAW);

const hudDimData = new ArrayBuffer(DIM_BUFFER_SIZE);
const hudDimBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, hudDimBuffer);
gl.bufferData(gl.ARRAY_BUFFER, DIM_BUFFER_SIZE, gl.STATIC_DRAW);


const subImageData = new ArrayBuffer(SUB_IMG_BUFFER_SIZE);
const subImageBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, subImageBuffer);
gl.bufferData(gl.ARRAY_BUFFER, SUB_IMG_BUFFER_SIZE, gl.STATIC_DRAW);

const hudSubImgData = new ArrayBuffer(SUB_IMG_BUFFER_SIZE);
const hudSubImgBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, hudSubImgBuffer);
gl.bufferData(gl.ARRAY_BUFFER, SUB_IMG_BUFFER_SIZE, gl.STATIC_DRAW);


const TOTAL_3D_BUFFER_SIZE = POS_BUFFER_SIZE + COLOR_BUFFER_SIZE + XFORMS_BUFFER_SIZE + DIM_BUFFER_SIZE +
    SUB_IMG_BUFFER_SIZE;
console.log(`total alloc 3d gfx buffer size: ${(TOTAL_3D_BUFFER_SIZE / 1024 / 1024).toFixed(2)} mb`);

const TOTAL_HUD_BUFFER_SIZE = POS_BUFFER_SIZE + COLOR_BUFFER_SIZE + XFORMS_BUFFER_SIZE + DIM_BUFFER_SIZE +
    SUB_IMG_BUFFER_SIZE;
console.log(`total alloc 3d gfx buffer size: ${(TOTAL_HUD_BUFFER_SIZE / 1024 / 1024).toFixed(2)} mb`);

gl.useProgram(program);
const minAlphaLocation = gl.getUniformLocation(program, 'minAlpha');
gl.uniform1f(minAlphaLocation, 1.0);

gl.useProgram(hudProg);
const hudMinALoc = gl.getUniformLocation(hudProg, 'minAlpha');
gl.uniform1f(hudMinALoc, 0.004);


const texture0 = gl.createTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture0);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const texture1 = gl.createTexture();
gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, texture1);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const avatarTexture = gl.createTexture();
gl.activeTexture(gl.TEXTURE2);
gl.bindTexture(gl.TEXTURE_2D, avatarTexture);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

gl.useProgram(program);
const texLocation = gl.getUniformLocation(program, 'textures[0]');
gl.uniform1iv(texLocation, [0, 1, 2]);

gl.useProgram(hudProg);
const hudTexLoc = gl.getUniformLocation(hudProg, 'textures[0]');
gl.uniform1iv(hudTexLoc, [0, 1, 2]);


const defaultViewMatrix = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
]);
const defHudViewMat = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    WIDTH / 2, HEIGHT / 2, 0, 1
]);

/*
 * TYPED VIEWS CONSTANTS
 */
export const renderStore = new RenderStore('3d', gl, ext, program, NO_CHANGES, ELEMENTS_CHUNK, 0,
    positionBuffer, colorBuffer, xformsBuffer, dimensionsBuffer, subImageBuffer,
    positionData, colorData, xformsData, dimensionsData, subImageData,
    viewLocation, viewMatrix, defaultViewMatrix);

renderStore.resizeTypedViews();

export const hudRenderStore = new RenderStore('hud', gl, ext, hudProg, NO_CHANGES, ELEMENTS_CHUNK, 0,
    hudPosBuffer, hudColorBuffer, hudXformsBuffer, hudDimBuffer, hudSubImgBuffer,
    hudPosData, hudColorData, hudXformsData, hudDimData, hudSubImgData,
    hudViewLoc, hudViewMat, defHudViewMat);

hudRenderStore.resizeTypedViews();


console.log(`3d sprite store size: ${(SPRITES_LENGTH * Uint16Array.BYTES_PER_ELEMENT / 1024).toFixed(2)} kb`);
console.log(`hud sprite store size: ${(SPRITES_LENGTH * Uint16Array.BYTES_PER_ELEMENT / 1024).toFixed(2)} kb`);

const totalSizeAnimBuffers = ANIM_SCALE_BUFFER_SIZE + ANIM_ROT1D_BUFFER_SIZE + ANIM_COLOR1C_BUFFER_SIZE + ANIM_POS_BUFFER_SIZE + ANIM_POSC_BUFFER_SIZE;
console.log(`animation system buffer size (excl. callback function pointers): ${(totalSizeAnimBuffers / 1024 / 1024).toFixed(2)} mb`);
