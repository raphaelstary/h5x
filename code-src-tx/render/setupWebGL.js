import AssetStore from '../net/AssetStore.js';
import RenderStore from './RenderStore.js';
import {ANIM_COLOR1C_BUFFER_SIZE} from './animations/Color1CAnimations.js';
import {ANIM_POS_BUFFER_SIZE} from './animations/PositionAnimations.js';
import {ANIM_POSC_BUFFER_SIZE} from './animations/PositionCurveAnimations.js';
import {ANIM_ROT1D_BUFFER_SIZE} from './animations/Rot1DAnimations.js';
import {ANIM_SCALE_BUFFER_SIZE} from './animations/ScaleAnimations.js';
import {SPRITES_BUFFER_SIZE} from './Sprites.js';
import {NO_CHANGES} from './constants/ChangeFlag.js';
import fragmentShaderSrc from './shader/SpriteFragmentShader.js';
import vertexShaderSrc from './shader/SpriteVertexShader.js';
import {
    POS_BUFFER_SIZE,
    POS_ELEMENTS
} from './constants/PosBuffer.js';
import {
    COLOR_BUFFER_SIZE,
    COLOR_ELEMENTS
} from './constants/ColorBuffer.js';
import {
    XFORMS_BUFFER_SIZE,
    XFORMS_ELEMENTS
} from './constants/XFormsBuffer.js';
import {
    DIM_BUFFER_SIZE,
    DIM_ELEMENTS
} from './constants/DimBuffer.js';
import {
    SUB_IMG_BUFFER_SIZE,
    SUB_IMG_ELEMENTS
} from './constants/SubImgBuffer.js';
import {ELEMENTS_CHUNK} from './constants/BaseBuffer.js';

export const assetStore = new AssetStore();

export function processAssets([, baseSubImageBuffer, img, spriteDimensionsBuffer, audioSegmentsBuffer, audioBuffer]) {
    assetStore.baseSubImages = new Float32Array(baseSubImageBuffer);
    assetStore.spriteDimensions = new Float32Array(spriteDimensionsBuffer);
    assetStore.audioSegments = new Float32Array(audioSegmentsBuffer);
    assetStore.audioBuffer = audioBuffer;

    const audioBufferSize = audioBuffer.length * audioBuffer.numberOfChannels * Float32Array.BYTES_PER_ELEMENT;
    console.log(`audio buffer size: ${(audioBufferSize / 1024 / 1024).toFixed(2)} mb`);

    const BASE_DIM_BUFFER_SIZE = assetStore.spriteDimensions.byteLength;
    const BASE_AUDIO_SEG_BUFFER_SIZE = assetStore.audioSegments.byteLength;
    const BASE_SUB_IMG_BUFFER_SIZE = assetStore.baseSubImages.byteLength;
    const TOTAL_BASE_BUFFER_SIZE = BASE_DIM_BUFFER_SIZE + BASE_SUB_IMG_BUFFER_SIZE + BASE_AUDIO_SEG_BUFFER_SIZE;
    console.log(`total loaded buffer size: ${(TOTAL_BASE_BUFFER_SIZE / 1024).toFixed(2)} kb`);
    console.log(`texture atlas back buffer size: ${(img.width * img.height * 4 / 1024 / 1024).toFixed(2)} mb`);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    return Promise.resolve();
}

const canvas = document.getElementById('screen');
const gl = canvas.getContext('webgl', {alpha: false});
const ext = gl.getExtension('ANGLE_instanced_arrays');

console.log('max texture size: ' + gl.getParameter(gl.MAX_TEXTURE_SIZE));
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

gl.useProgram(program);


/*
 * VIEW CONSTANTS
 */
const WIDTH = 16;
const HEIGHT = 9;
const Z_NEAR = 0.1;
const Z_FAR = 10.0;

const viewLocation = gl.getUniformLocation(program, 'view');
gl.uniformMatrix4fv(viewLocation, false, new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
]));

const aspect = WIDTH / HEIGHT;
const fov = Math.PI * 0.5;
const f = 1.0 / Math.tan(fov / 2);

const a = f / aspect;
const c = (Z_NEAR + Z_FAR) / (Z_NEAR - Z_FAR);
const tz = 2 * Z_FAR * Z_NEAR / (Z_NEAR - Z_FAR);

const projectionLocation = gl.getUniformLocation(program, 'projection');
gl.uniformMatrix4fv(projectionLocation, false, new Float32Array([
    a, 0, 0, 0,
    0, f, 0, 0,
    0, 0, c, -1,
    0, 0, tz, 0
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


const positionData = new ArrayBuffer(POS_BUFFER_SIZE);
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, POS_BUFFER_SIZE, gl.DYNAMIC_DRAW);

const positionLocation = gl.getAttribLocation(program, 'position');
gl.vertexAttribPointer(positionLocation, POS_ELEMENTS, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLocation);
ext.vertexAttribDivisorANGLE(positionLocation, 1);


const colorData = new ArrayBuffer(COLOR_BUFFER_SIZE);
const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, COLOR_BUFFER_SIZE, gl.DYNAMIC_DRAW);

const colorLocation = gl.getAttribLocation(program, 'color');
gl.vertexAttribPointer(colorLocation, COLOR_ELEMENTS, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(colorLocation);
ext.vertexAttribDivisorANGLE(colorLocation, 1);


const xformsData = new ArrayBuffer(XFORMS_BUFFER_SIZE);
const xformsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, xformsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, XFORMS_BUFFER_SIZE, gl.DYNAMIC_DRAW);

const xformsLocation = gl.getAttribLocation(program, 'xforms');
gl.vertexAttribPointer(xformsLocation, XFORMS_ELEMENTS, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(xformsLocation);
ext.vertexAttribDivisorANGLE(xformsLocation, 1);


const dimensionsData = new ArrayBuffer(DIM_BUFFER_SIZE);
const dimensionsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, dimensionsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, DIM_BUFFER_SIZE, gl.STATIC_DRAW);

const dimensionsLocation = gl.getAttribLocation(program, 'dimensions');
gl.vertexAttribPointer(dimensionsLocation, DIM_ELEMENTS, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(dimensionsLocation);
ext.vertexAttribDivisorANGLE(dimensionsLocation, 1);


const subImageData = new ArrayBuffer(SUB_IMG_BUFFER_SIZE);
const subImageBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, subImageBuffer);
gl.bufferData(gl.ARRAY_BUFFER, SUB_IMG_BUFFER_SIZE, gl.STATIC_DRAW);

const subImageLocation = gl.getAttribLocation(program, 'subImage');
gl.vertexAttribPointer(subImageLocation, SUB_IMG_ELEMENTS, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(subImageLocation);
ext.vertexAttribDivisorANGLE(subImageLocation, 1);

const TOTAL_BUFFER_SIZE = POS_BUFFER_SIZE + COLOR_BUFFER_SIZE + XFORMS_BUFFER_SIZE + DIM_BUFFER_SIZE +
    SUB_IMG_BUFFER_SIZE;
console.log(`total alloc gfx buffer size: ${(TOTAL_BUFFER_SIZE / 1024 / 1024).toFixed(2)} mb`);

const texture = gl.createTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const texLocation = gl.getUniformLocation(program, 'tex');
gl.uniform1i(texLocation, 0);


/*
 * TYPED VIEWS CONSTANTS
 */

export const renderStore = new RenderStore(gl, ext, NO_CHANGES, ELEMENTS_CHUNK, 0,
    positionBuffer, colorBuffer, xformsBuffer, dimensionsBuffer, subImageBuffer,
    positionData, colorData, xformsData, dimensionsData, subImageData);

renderStore.resizeTypedViews();


console.log(`sprite store size: ${(SPRITES_BUFFER_SIZE / 1024).toFixed(2)} kb`);

const totalSizeAnimBuffers = ANIM_SCALE_BUFFER_SIZE + ANIM_ROT1D_BUFFER_SIZE + ANIM_COLOR1C_BUFFER_SIZE + ANIM_POS_BUFFER_SIZE + ANIM_POSC_BUFFER_SIZE;
console.log(`animation system buffer size (excl. callback function pointers): ${(totalSizeAnimBuffers / 1024 / 1024).toFixed(2)} mb`);