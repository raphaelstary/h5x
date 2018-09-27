import * as SubImage from '../code-gen/SubImage.js';
import spriteDimensions from '../code-gen/SpriteDimensions.js';

let baseSubImages;

if (window.Windows)
    console.log(`I'm running on Windows 😎`);

Promise.all([

    new Promise(resolve => window.onload = resolve),

    fetch('../asset-gen/sub-images_720.h5')
        .then(response => {
            if (response.ok)
                return response.arrayBuffer();

            throw new Error('could not fetch sub-image-data');
        }),

    fetch('../asset-gen/atlas_720_0.png')
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
        })
])
    .catch(error => console.log(error))
    .then(values => {
        baseSubImages = new Float32Array(values[1]);
        const img = values[2];

        const BASE_DIM_BUFFER_SIZE = spriteDimensions.byteLength;
        const BASE_SUB_IMG_BUFFER_SIZE = baseSubImages.byteLength;
        const TOTAL_BASE_BUFFER_SIZE = BASE_DIM_BUFFER_SIZE + BASE_SUB_IMG_BUFFER_SIZE;
        console.log(`total loaded buffer size: ${(TOTAL_BASE_BUFFER_SIZE / 1024).toFixed(2)} kb`);
        console.log(`texture atlas bitmap size: ${(img.width * img.height * 4 / 1024 / 1024).toFixed(2)} mb`);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        eventLoop();

        runTestScene();
    });

const canvas = document.getElementById('screen');
const gl = canvas.getContext('webgl', {alpha: false});
const ext = gl.getExtension('ANGLE_instanced_arrays');

console.log('max texture size: ' + gl.getParameter(gl.MAX_TEXTURE_SIZE));
console.log('max vertex attribs: ' + gl.getParameter(gl.MAX_VERTEX_ATTRIBS));

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.enable(gl.CULL_FACE);


const vertexShaderSrc = `

attribute vec3 position;
attribute vec4 xforms;
attribute vec2 dimensions;
attribute vec4 color;
attribute vec4 subImage;
attribute vec4 quad;

uniform mat4 view;
uniform mat4 projection;

varying vec2 texCoord;
varying vec4 texColor;

void main() {
    float tx = dimensions.x * quad.x;
    float ty = dimensions.y * quad.y;
    mat4 translate = mat4(
        1.0, 0, 0, 0,
        0, 1.0, 0, 0,
        0, 0, 1.0, 0,
        tx, ty, 0, 1.0
    );

    float cx = cos(xforms.x);
    float sx = sin(xforms.x);
    mat4 rotateX = mat4(
        1.0, 0, 0, 0,
        0, cx, sx, 0,
        0, -sx, cx, 0,
        0, 0, 0, 1.0
    );

    float cy = cos(xforms.y);
    float sy = sin(xforms.y);
    mat4 rotateY = mat4(
        cy, 0, -sy, 0,
        0, 1.0, 0, 0,
        sy, 0, cy, 0,
        0, 0, 0, 1.0
    );

    float cz = cos(xforms.z);
    float sz = sin(xforms.z);
    mat4 rotateZ = mat4(
        cz, sz, 0, 0,
        -sz, cz, 0, 0,
        0, 0, 1.0, 0,
        0, 0, 0, 1.0
    );

    float s = xforms.w;
    mat4 scale = mat4(
        s, 0, 0, 0,
        0, s, 0, 0,
        0, 0, 1.0, 0,
        0, 0, 0, 1.0
    );

    vec4 tmpPosition = translate * vec4(position, 1.0);

    translate[3][0] = -position.x;
    translate[3][1] = -position.y;
    translate[3][2] = -position.z;

    tmpPosition = rotateX * rotateY * rotateZ * translate * tmpPosition;

    translate[3][0] = position.x;
    translate[3][1] = position.y;
    translate[3][2] = position.z;

    gl_Position = projection * view * translate * scale * tmpPosition;

    texCoord = vec2(subImage.x + subImage.z * quad.z, subImage.y + subImage.w * quad.w);
    texColor = color;
}
`;

const fragmentShaderSrc = `

precision highp float;

uniform sampler2D tex;
varying vec2 texCoord;
varying vec4 texColor;

void main() {
    vec4 pixel = texture2D(tex, texCoord);
    if (pixel.a < 1.0)
        discard;
    gl_FragColor = mix(pixel, texColor, texColor.a);
}
`;

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


/*
 * BUFFER CONSTANTS
 */
const MAX_ELEMENTS = 1 << 14;

const POS_ELEMENTS = 3;
const POS_X_OFFSET = 0;
const POS_Y_OFFSET = 1;
const POS_Z_OFFSET = 2;
const POS_BUFFER_SIZE = Float32Array.BYTES_PER_ELEMENT * POS_ELEMENTS * MAX_ELEMENTS;

const positionData = new ArrayBuffer(POS_BUFFER_SIZE);
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, POS_BUFFER_SIZE, gl.DYNAMIC_DRAW);

const positionLocation = gl.getAttribLocation(program, 'position');
gl.vertexAttribPointer(positionLocation, POS_ELEMENTS, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLocation);
ext.vertexAttribDivisorANGLE(positionLocation, 1);

const COLOR_ELEMENTS = 4;
const COLOR_RED_OFFSET = 0;
const COLOR_GREEN_OFFSET = 1;
const COLOR_BLUE_OFFSET = 2;
const COLOR_ALPHA_OFFSET = 3;
const COLOR_BUFFER_SIZE = Float32Array.BYTES_PER_ELEMENT * COLOR_ELEMENTS * MAX_ELEMENTS;

const colorData = new ArrayBuffer(COLOR_BUFFER_SIZE);
const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, COLOR_BUFFER_SIZE, gl.DYNAMIC_DRAW);

const colorLocation = gl.getAttribLocation(program, 'color');
gl.vertexAttribPointer(colorLocation, COLOR_ELEMENTS, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(colorLocation);
ext.vertexAttribDivisorANGLE(colorLocation, 1);

const XFORMS_ELEMENTS = 4;
const XFORMS_ROTATION_X_OFFSET = 0;
const XFORMS_ROTATION_Y_OFFSET = 1;
const XFORMS_ROTATION_Z_OFFSET = 2;
const XFORMS_SCALE_OFFSET = 3;
const XFORMS_BUFFER_SIZE = Float32Array.BYTES_PER_ELEMENT * XFORMS_ELEMENTS * MAX_ELEMENTS;

const xformsData = new ArrayBuffer(XFORMS_BUFFER_SIZE);
const xformsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, xformsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, XFORMS_BUFFER_SIZE, gl.DYNAMIC_DRAW);

const xformsLocation = gl.getAttribLocation(program, 'xforms');
gl.vertexAttribPointer(xformsLocation, XFORMS_ELEMENTS, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(xformsLocation);
ext.vertexAttribDivisorANGLE(xformsLocation, 1);

const DIM_ELEMENTS = 2;
const DIM_BUFFER_SIZE = Float32Array.BYTES_PER_ELEMENT * DIM_ELEMENTS * MAX_ELEMENTS;

const dimensionsData = new ArrayBuffer(DIM_BUFFER_SIZE);
const dimensionsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, dimensionsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, DIM_BUFFER_SIZE, gl.STATIC_DRAW);

const dimensionsLocation = gl.getAttribLocation(program, 'dimensions');
gl.vertexAttribPointer(dimensionsLocation, DIM_ELEMENTS, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(dimensionsLocation);
ext.vertexAttribDivisorANGLE(dimensionsLocation, 1);

const SUB_IMG_ELEMENTS = 4;
const SUB_IMG_BUFFER_SIZE = Float32Array.BYTES_PER_ELEMENT * SUB_IMG_ELEMENTS * MAX_ELEMENTS;

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
console.log(`total alloc buffer size: ${(TOTAL_BUFFER_SIZE / 1024 / 1024).toFixed(2)} mb`);

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
const ELEMENTS_CHUNK = 1 << 6;

/*
 * TYPED VIEWS
 */
let positions;
let colors;
let xforms;
let dimensions;
let subImages;

function resizeTypedViews(elements) {
    positions = new Float32Array(positionData, 0, elements * POS_ELEMENTS);
    colors = new Float32Array(colorData, 0, elements * COLOR_ELEMENTS);
    xforms = new Float32Array(xformsData, 0, elements * XFORMS_ELEMENTS);
    dimensions = new Float32Array(dimensionsData, 0, elements * DIM_ELEMENTS);
    subImages = new Float32Array(subImageData, 0, elements * SUB_IMG_ELEMENTS);

    const TOTAL_SUB_BUFFER_SIZE = positions.byteLength + colors.byteLength + xforms.byteLength +
        dimensions.byteLength + subImages.byteLength;
    console.log(`current gpu sub buffer tick update size: ${(TOTAL_SUB_BUFFER_SIZE / 1024).toFixed(2)} kb`);
}

let currentMaxElements = ELEMENTS_CHUNK;
resizeTypedViews(currentMaxElements);


/*
 * RENDERER API & SPRITE MNGMT STATE CONSTANTS
 */
const ACTIVE_FLAG = 0b1;
const VERSION_BITS = 15;
const VERSION_MASK = 0b111111111111111;
const MAX_VERSION = (1 << VERSION_BITS) - 1;
const INVALID_INDEX = -1;

const POS_CHANGED = 0b00001;
const COLORS_CHANGED = 0b00010;
const XFORMS_CHANGED = 0b00100;
const DIM_CHANGED = 0b01000;
const SUB_IMG_CHANGED = 0b10000;
const NO_CHANGES = 0b00000;

let changeFlags = NO_CHANGES;

/*
 * SPRITE MANAGEMENT STATE
 */
let spriteCount = 0;
let lowIndex = 0;
let highIndex = 0;

const sprites = new Uint16Array(MAX_ELEMENTS);
console.log(`sprite store size: ${(sprites.byteLength / 1024).toFixed(2)} kb`);


/*
 * SPRITE API
 */
function getIndex(id) {
    const idx = id >> VERSION_BITS;
    const version = id & VERSION_MASK;
    const currentVersion = sprites[idx] >> 1;

    if (version == currentVersion)
        return idx;
    return INVALID_INDEX;
}

function createSprite(imgId, x, y) {
    let idx;
    let version;

    for (idx = 0; idx < sprites.length; idx++) {

        const flags = sprites[idx];

        if (!(flags & ACTIVE_FLAG)) {

            version = flags >> 1;
            sprites[idx] = flags | ACTIVE_FLAG;

            break;
        }
    }

    if (idx == undefined || version == undefined)
        throw new Error('could not create new sprite, probably no space left');


    spriteCount++;
    changeFlags = POS_CHANGED | COLORS_CHANGED | XFORMS_CHANGED | DIM_CHANGED | SUB_IMG_CHANGED;

    if (lowIndex > idx)
        lowIndex = idx;

    if (highIndex < idx) {
        highIndex = idx;

        if (highIndex + 1 > currentMaxElements) {
            currentMaxElements += ELEMENTS_CHUNK;
            resizeTypedViews(currentMaxElements);
        }
    }

    positions[idx * POS_ELEMENTS] = x;
    positions[idx * POS_ELEMENTS + 1] = y;
    positions[idx * POS_ELEMENTS + 2] = -5.0;

    colors[idx * COLOR_ELEMENTS] = 1.0;
    colors[idx * COLOR_ELEMENTS + 1] = 1.0;
    colors[idx * COLOR_ELEMENTS + 2] = 1.0;
    colors[idx * COLOR_ELEMENTS + 3] = 0.0;

    xforms[idx * XFORMS_ELEMENTS] = 0.0;
    xforms[idx * XFORMS_ELEMENTS + 1] = 0.0;
    xforms[idx * XFORMS_ELEMENTS + 2] = 0.0;
    xforms[idx * XFORMS_ELEMENTS + 3] = 1.0;

    const dimIdx = imgId * DIM_ELEMENTS;
    dimensions[idx * DIM_ELEMENTS] = spriteDimensions[dimIdx];
    dimensions[idx * DIM_ELEMENTS + 1] = spriteDimensions[dimIdx + 1];

    const subImgIdx = imgId * SUB_IMG_ELEMENTS;
    subImages[idx * SUB_IMG_ELEMENTS] = baseSubImages[subImgIdx];
    subImages[idx * SUB_IMG_ELEMENTS + 1] = baseSubImages[subImgIdx + 1];
    subImages[idx * SUB_IMG_ELEMENTS + 2] = baseSubImages[subImgIdx + 2];
    subImages[idx * SUB_IMG_ELEMENTS + 3] = baseSubImages[subImgIdx + 3];

    return idx << VERSION_BITS | version;
}

function deleteSprite(idx) {
    spriteCount--;

    let currentVersion = sprites[idx] >> 1;

    if (currentVersion < MAX_VERSION) {
        currentVersion++; // increase version
        sprites[idx] = currentVersion << 1; // clear active flag -> set inactive

    } else {
        console.log(`sprite @${idx} is at max version`);
    }

    setZ(idx, 1.0);

    if (lowIndex == idx) {
        for (let i = idx; i < sprites.length; i++) {
            if (sprites[i] & ACTIVE_FLAG) {
                lowIndex = i;
                break;
            }
        }
    }

    if (highIndex == idx) {
        for (let i = idx; i >= 0; i--) {
            if (sprites[i] & ACTIVE_FLAG) {
                highIndex = i;
                break;
            }
        }

        if (highIndex + 1 < currentMaxElements - 2 * ELEMENTS_CHUNK) {
            currentMaxElements -= ELEMENTS_CHUNK;
            resizeTypedViews(currentMaxElements);
        }
    }
}

function setX(idx, x) {
    positions[idx * POS_ELEMENTS + POS_X_OFFSET] = x;

    changeFlags |= POS_CHANGED;
}

function getX(idx) {
    return positions[idx * POS_ELEMENTS + POS_X_OFFSET];
}

function setY(idx, y) {
    positions[idx * POS_ELEMENTS + POS_Y_OFFSET] = y;

    changeFlags |= POS_CHANGED;
}

function getY(idx) {
    return positions[idx * POS_ELEMENTS + POS_Y_OFFSET];
}

function setZ(idx, z) {
    positions[idx * POS_ELEMENTS + POS_Z_OFFSET] = z;

    changeFlags |= POS_CHANGED;
}

function getZ(idx) {
    return positions[idx * POS_ELEMENTS + POS_Z_OFFSET];
}

function setColor(idx, r, g, b, a) {
    colors[idx * COLOR_ELEMENTS + COLOR_RED_OFFSET] = r;
    colors[idx * COLOR_ELEMENTS + COLOR_GREEN_OFFSET] = g;
    colors[idx * COLOR_ELEMENTS + COLOR_BLUE_OFFSET] = b;
    colors[idx * COLOR_ELEMENTS + COLOR_ALPHA_OFFSET] = a;

    changeFlags |= COLORS_CHANGED;
}

function setRed(idx, r) {
    colors[idx * COLOR_ELEMENTS + COLOR_RED_OFFSET] = r;

    changeFlags |= COLORS_CHANGED;
}

function getRed(idx) {
    return colors[idx * COLOR_ELEMENTS + COLOR_RED_OFFSET];
}

function setGreen(idx, g) {
    colors[idx * COLOR_ELEMENTS + COLOR_GREEN_OFFSET] = g;

    changeFlags |= COLORS_CHANGED;
}

function getGreen(idx) {
    return colors[idx * COLOR_ELEMENTS + COLOR_GREEN_OFFSET];
}

function setBlue(idx, b) {
    colors[idx * COLOR_ELEMENTS + COLOR_BLUE_OFFSET] = b;

    changeFlags |= COLORS_CHANGED;
}

function getBlue(idx) {
    return colors[idx * COLOR_ELEMENTS + COLOR_BLUE_OFFSET];
}

function setAlpha(idx, a) {
    colors[idx * COLOR_ELEMENTS + COLOR_ALPHA_OFFSET] = a;

    changeFlags |= COLORS_CHANGED;
}

function getAlpha(idx) {
    return colors[idx * COLOR_ELEMENTS + COLOR_ALPHA_OFFSET];
}

function setRotationX(idx, rotation) {
    xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_X_OFFSET] = rotation;

    changeFlags |= COLORS_CHANGED;
}

function getRotationX(idx) {
    return xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_X_OFFSET];
}

function setRotationY(idx, rotation) {
    xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_Y_OFFSET] = rotation;

    changeFlags |= XFORMS_CHANGED;
}

function getRotationY(idx) {
    return xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_Y_OFFSET];
}

function setRotationZ(idx, rotation) {
    xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_Z_OFFSET] = rotation;

    changeFlags |= XFORMS_CHANGED;
}

function getRotationZ(idx) {
    return xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_Z_OFFSET];
}

function setScale(idx, scale) {
    xforms[idx * XFORMS_ELEMENTS + XFORMS_SCALE_OFFSET] = scale;

    changeFlags |= XFORMS_CHANGED;
}

function getScale(idx) {
    return xforms[idx * XFORMS_ELEMENTS + XFORMS_SCALE_OFFSET];
}

function setSubImage(idx, imgId) {
    const dimIdx = imgId * DIM_ELEMENTS;
    dimensions[idx * DIM_ELEMENTS] = spriteDimensions[dimIdx];
    dimensions[idx * DIM_ELEMENTS + 1] = spriteDimensions[dimIdx + 1];

    const subImgIdx = imgId * SUB_IMG_ELEMENTS;
    subImages[idx * SUB_IMG_ELEMENTS] = baseSubImages[subImgIdx];
    subImages[idx * SUB_IMG_ELEMENTS + 1] = baseSubImages[subImgIdx + 1];
    subImages[idx * SUB_IMG_ELEMENTS + 2] = baseSubImages[subImgIdx + 2];
    subImages[idx * SUB_IMG_ELEMENTS + 3] = baseSubImages[subImgIdx + 3];

    changeFlags |= DIM_CHANGED | SUB_IMG_CHANGED;
}

function getWidth(idx) {
    return dimensions[idx * DIM_ELEMENTS] * 2;
}

function getHeight(idx) {
    return dimensions[idx * DIM_ELEMENTS + 1] * 2;
}

/*
 * ANIMATION
 */
const ANIM_MAX_ELEMENTS = 1 << 14;
const ANIM_BYTES_PER_ELEMENT = 28;
const ANIM_BUFFER_SIZE = ANIM_BYTES_PER_ELEMENT * ANIM_MAX_ELEMENTS;

const animScaleBuffer = new ArrayBuffer(ANIM_BUFFER_SIZE);
const scaleAnimations = new DataView(animScaleBuffer);
let animScaleCount = 0;
let animScaleMinIdx = 0;
let animScaleMaxIdx = 0;

// 4 bytes fields:
const ANIM_VERSION_N_STATE_OFFSET = 0;  // 2 byte
const ANIM_INFO_OFFSET = 2;     // 2 byte
const ANIM_SPRITE_OFFSET = 4;   // 4 byte
const ANIM_TIMING_OFFSET = 8;  // 2 byte
// 2 byte padding (maybe add curve here)
const ANIM_START_OFFSET = 12;   // 4 byte
const ANIM_END_OFFSET = 16;     // 4 byte
const ANIM_FROM_OFFSET = 20;    // 4 byte
const ANIM_TO_OFFSET = 24;      // 4 byte

// info flags
const CALLBACK_FLAG = 0b0000000000000001;
const LOOP_FLAG = 0b0000000000000010;

const ANIM_SCALE_CB_KEY = 'anim-scale-';
const callbacks = {};

console.log(`scale animation system buffer size (excl. callback function pointers): ${(animScaleBuffer.byteLength / 1024).toFixed(2)} kb`);

/*
if (property & POS_X_FLAG)
    animations.setFloat32(offset + ANIM_FROM_OFFSET, getX(spriteIdx));
if (property & POS_Y_FLAG)
    animations.setFloat32(offset + ANIM_FROM_OFFSET, getY(spriteIdx));
if (property & POS_Z_FLAG)
    animations.setFloat32(offset + ANIM_FROM_OFFSET, getZ(spriteIdx));
if (property & COLOR_R_FLAG)
    animations.setFloat32(offset + ANIM_FROM_OFFSET, getRed(spriteIdx));
if (property & COLOR_G_FLAG)
    animations.setFloat32(offset + ANIM_FROM_OFFSET, getGreen(spriteIdx));
if (property & COLOR_B_FLAG)
    animations.setFloat32(offset + ANIM_FROM_OFFSET, getBlue(spriteIdx));
if (property & COLOR_A_FLAG)
    animations.setFloat32(offset + ANIM_FROM_OFFSET, getAlpha(spriteIdx));
if (property & XFORM_RX_FLAG)
    animations.setFloat32(offset + ANIM_FROM_OFFSET, getRotationX(spriteIdx));
if (property & XFORM_RY_FLAG)
    animations.setFloat32(offset + ANIM_FROM_OFFSET, getRotationY(spriteIdx));
if (property & XFORM_RZ_FLAG)
    animations.setFloat32(offset + ANIM_FROM_OFFSET, getRotationZ(spriteIdx));
if (property & XFORM_S_FLAG)
    animations.setFloat32(offset + ANIM_FROM_OFFSET, getScale(spriteIdx));
*/

function getScaleAnimationIndex(id) {
    const idx = id >> VERSION_BITS;
    const version = id & VERSION_MASK;
    const offset = idx * ANIM_BYTES_PER_ELEMENT + ANIM_VERSION_N_STATE_OFFSET;
    const currentVersion = scaleAnimations.getUint16(offset) >> 1;

    if (version == currentVersion)
        return idx;
    return INVALID_INDEX;
}

function createScaleAnimation(sprite, duration, toValue, timing) {
    let idx;
    let version;
    for (idx = 0; idx < ANIM_MAX_ELEMENTS; idx++) {

        const flags = scaleAnimations.getUint16(idx * ANIM_BYTES_PER_ELEMENT + ANIM_VERSION_N_STATE_OFFSET);

        if (!(flags & ACTIVE_FLAG)) {

            version = flags >> 1;
            scaleAnimations.setUint16(idx * ANIM_BYTES_PER_ELEMENT + ANIM_VERSION_N_STATE_OFFSET, flags | ACTIVE_FLAG);

            break;
        }
    }

    if (idx == undefined)
        throw new Error('could not create new scale animation, probably no space left');

    animScaleCount++;

    if (animScaleMinIdx > idx)
        animScaleMinIdx = idx;

    if (animScaleMaxIdx < idx)
        animScaleMaxIdx = idx;

    const offset = idx * ANIM_BYTES_PER_ELEMENT;

    scaleAnimations.setUint16(offset + ANIM_INFO_OFFSET, 0);

    scaleAnimations.setUint32(offset + ANIM_SPRITE_OFFSET, sprite);
    scaleAnimations.setUint16(offset + ANIM_TIMING_OFFSET, timing);
    scaleAnimations.setUint32(offset + ANIM_START_OFFSET, frame);
    scaleAnimations.setUint32(offset + ANIM_END_OFFSET, frame + duration);

    scaleAnimations.setFloat32(offset + ANIM_FROM_OFFSET, getScale(sprite >> VERSION_BITS));
    scaleAnimations.setFloat32(offset + ANIM_TO_OFFSET, toValue);

    return idx << VERSION_BITS | version;
}

function loopScaleAnimation(idx) {
    const offset = idx * ANIM_BYTES_PER_ELEMENT;
    const info = scaleAnimations.getUint16(offset + ANIM_INFO_OFFSET);

    scaleAnimations.setUint16(offset + ANIM_INFO_OFFSET, info | LOOP_FLAG);
}

function stopLoopingScaleAnimation(idx) {
    const offset = idx * ANIM_BYTES_PER_ELEMENT;
    const info = scaleAnimations.getUint16(offset + ANIM_INFO_OFFSET);

    scaleAnimations.setUint16(offset + ANIM_INFO_OFFSET, info & ~LOOP_FLAG);
}

function isScaleAnimationLooping(idx) {
    const offset = idx * ANIM_BYTES_PER_ELEMENT;
    const info = scaleAnimations.getUint16(offset + ANIM_INFO_OFFSET);
    return info & LOOP_FLAG;
}

function setScaleAnimationCallback(idx, callback) {
    const offset = idx * ANIM_BYTES_PER_ELEMENT;
    const info = scaleAnimations.getUint16(offset + ANIM_INFO_OFFSET);

    scaleAnimations.setUint16(offset + ANIM_INFO_OFFSET, info | CALLBACK_FLAG);
    callbacks[ANIM_SCALE_CB_KEY + idx] = callback;
}

function removeScaleAnimationCallback(idx) {
    const offset = idx * ANIM_BYTES_PER_ELEMENT;
    const info = scaleAnimations.getUint16(offset + ANIM_INFO_OFFSET);

    scaleAnimations.setUint16(offset + ANIM_INFO_OFFSET, info & ~CALLBACK_FLAG);
    delete callbacks[ANIM_SCALE_CB_KEY + idx];
}

function hasScaleAnimationCallback(idx) {
    const offset = idx * ANIM_BYTES_PER_ELEMENT;
    const info = scaleAnimations.getUint16(offset + ANIM_INFO_OFFSET);
    return info & CALLBACK_FLAG;
}

function restartScaleAnimation(idx) {
    const offset = idx * ANIM_BYTES_PER_ELEMENT;
    const duration = scaleAnimations.getUint32(offset + ANIM_END_OFFSET) - scaleAnimations.getUint32(offset + ANIM_START_OFFSET);
    scaleAnimations.setUint32(offset + ANIM_START_OFFSET, frame);
    scaleAnimations.setUint32(offset + ANIM_END_OFFSET, frame + duration);
}

function delayScaleAnimation(idx, duration) {
    const offset = idx * ANIM_BYTES_PER_ELEMENT;
    const length = scaleAnimations.getUint32(offset + ANIM_END_OFFSET) - scaleAnimations.getUint32(offset + ANIM_START_OFFSET);
    scaleAnimations.setUint32(offset + ANIM_START_OFFSET, frame + duration);
    scaleAnimations.setUint32(offset + ANIM_END_OFFSET, frame + duration + length);
}

function deleteScaleAnimation(idx) {
    animScaleCount--;

    const offset = idx * ANIM_BYTES_PER_ELEMENT + ANIM_VERSION_N_STATE_OFFSET;

    let currentVersion = scaleAnimations.getUint16(offset) >> 1;

    if (currentVersion < MAX_VERSION) {
        currentVersion++; // increase version
        scaleAnimations.setUint16(offset, currentVersion << 1);

    } else {
        console.log(`scale animation @${idx} is at max version`);
    }

    if (animScaleMinIdx == idx) {
        for (let i = idx; i <= animScaleMaxIdx; i++) {
            if (scaleAnimations.getUint16(i * ANIM_BYTES_PER_ELEMENT + ANIM_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                animScaleMinIdx = i;
                break;
            }
        }
        if (animScaleMinIdx == idx)
            animScaleMinIdx = animScaleMaxIdx;
    }

    if (animScaleMaxIdx == idx) {
        for (let i = idx; i >= animScaleMinIdx; i--) {
            if (scaleAnimations.getUint16(i * ANIM_BYTES_PER_ELEMENT + ANIM_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                animScaleMaxIdx = i;
                break;
            }
        }
        if (animScaleMaxIdx == idx)
            animScaleMaxIdx = animScaleMinIdx;
    }
}

// TRANSITION TIMING FLAGs (aka SPACING aka the transformation fn)
const LINEAR = 0b0000000000000000;
const EASE_IN_QUAD = 0b0000000000000001;
const EASE_OUT_QUAD = 0b0000000000000010;
const EASE_IN_OUT_QUAD = 0b0000000000000100;
const EASE_IN_CUBIC = 0b0000000000001000;
const EASE_OUT_CUBIC = 0b0000000000010000;
const EASE_IN_OUT_CUBIC = 0b0000000000100000;
const EASE_IN_QUART = 0b0000000001000000;
const EASE_OUT_QUART = 0b0000000010000000;
const EASE_IN_OUT_QUART = 0b0000000100000000;
const EASE_IN_QUINT = 0b0000001000000000;
const EASE_OUT_QUINT = 0b0000010000000000;
const EASE_IN_OUT_QUINT = 0b0000100000000000;

function map(x, minX, maxX, minY, maxY, trans) {
    const xNormalized = (x - minX) / (maxX - minX);


    let xTransformed;
    if (trans & EASE_IN_QUAD)
        xTransformed = xNormalized * xNormalized;
    else if (trans & EASE_IN_CUBIC)
        xTransformed = xNormalized * xNormalized * xNormalized;
    else if (trans & EASE_IN_QUART)
        xTransformed = xNormalized * xNormalized * xNormalized * xNormalized;
    else if (trans & EASE_IN_QUINT)
        xTransformed = xNormalized * xNormalized * xNormalized * xNormalized * xNormalized;

    else if (trans & EASE_OUT_QUAD) {
        const t = (1 - xNormalized);
        xTransformed = 1 - t * t;
    }
    else if (trans & EASE_OUT_CUBIC) {
        const t = (1 - xNormalized);
        xTransformed = 1 - t * t * t;
    }
    else if (trans & EASE_OUT_QUART) {
        const t = (1 - xNormalized);
        xTransformed = 1 - t * t * t * t;
    }
    else if (trans & EASE_OUT_QUINT) {
        const t = (1 - xNormalized);
        xTransformed = 1 - t * t * t * t * t;
    }

    else if (trans & EASE_IN_OUT_QUAD) {
        const x0 = xNormalized * xNormalized;
        const t = (1 - xNormalized);
        const x1 = 1 - t * t;
        const xMixed = x0 * (1 - xNormalized) + x1 * xNormalized;
        xTransformed = xMixed;
    }
    else if (trans & EASE_IN_OUT_CUBIC) {
        const x0 = xNormalized * xNormalized * xNormalized;
        const t = (1 - xNormalized);
        const x1 = 1 - t * t * t;
        const xMixed = x0 * (1 - xNormalized) + x1 * xNormalized;
        xTransformed = xMixed;
    }
    else if (trans & EASE_IN_OUT_QUART) {
        const x0 = xNormalized * xNormalized * xNormalized * xNormalized;
        const t = (1 - xNormalized);
        const x1 = 1 - t * t * t * t;
        const xMixed = x0 * (1 - xNormalized) + x1 * xNormalized;
        xTransformed = xMixed;
    }
    else if (trans & EASE_IN_OUT_QUINT) {
        const x0 = xNormalized * xNormalized * xNormalized * xNormalized * xNormalized;
        const t = (1 - xNormalized);
        const x1 = 1 - t * t * t * t * t;
        const xMixed = x0 * (1 - xNormalized) + x1 * xNormalized;
        xTransformed = xMixed;
    }

    else if (trans & LINEAR)
        xTransformed = xNormalized;


    const xScaled = xTransformed * (maxY - minY) + minY;
    return xScaled;
}

let frame = 0;

/*
 * EVENT LOOP
 */
function eventLoop() {
    requestAnimationFrame(eventLoop);

    // animate scaling for current frame
    {
        if (animScaleCount > 0)
            for (var idx = animScaleMinIdx; idx <= animScaleMaxIdx; idx++) {
                const offset = idx * ANIM_BYTES_PER_ELEMENT;
                const flags = scaleAnimations.getUint16(offset + ANIM_VERSION_N_STATE_OFFSET);
                if (flags & ACTIVE_FLAG) {

                    const start = scaleAnimations.getUint32(offset + ANIM_START_OFFSET);
                    if (start > frame)
                        continue;

                    const info = scaleAnimations.getUint16(offset + ANIM_INFO_OFFSET);
                    const sprite = scaleAnimations.getUint32(offset + ANIM_SPRITE_OFFSET);
                    const timing = scaleAnimations.getUint16(offset + ANIM_TIMING_OFFSET);
                    const end = scaleAnimations.getUint32(offset + ANIM_END_OFFSET);
                    const from = scaleAnimations.getFloat32(offset + ANIM_FROM_OFFSET);
                    const to = scaleAnimations.getFloat32(offset + ANIM_TO_OFFSET);

                    const nextScaleValue = map(frame, start, end, from, to, timing);

                    const spriteIdx = sprite >> VERSION_BITS; //getIndex(sprite);
                    {
                        xforms[spriteIdx * XFORMS_ELEMENTS + XFORMS_SCALE_OFFSET] = nextScaleValue;
                        changeFlags |= XFORMS_CHANGED;
                    }

                    if (end == frame) {
                        if (info & LOOP_FLAG) {
                            scaleAnimations.setUint32(offset + ANIM_START_OFFSET, frame);
                            scaleAnimations.setUint32(offset + ANIM_END_OFFSET, frame + (end - start));

                            if (info & CALLBACK_FLAG) {
                                callbacks[ANIM_SCALE_CB_KEY + idx]();
                            }
                        } else {
                            deleteScaleAnimation(idx);

                            if (info & CALLBACK_FLAG) {
                                callbacks[ANIM_SCALE_CB_KEY + idx]();
                                delete callbacks[ANIM_SCALE_CB_KEY + idx];
                            }
                        }
                    }
                }
            }

        frame++;
    }

    // draw frame
    {
        if (changeFlags & POS_CHANGED) {
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
        }

        if (changeFlags & COLORS_CHANGED) {
            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors);
        }

        if (changeFlags & XFORMS_CHANGED) {
            gl.bindBuffer(gl.ARRAY_BUFFER, xformsBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, xforms);
        }

        if (changeFlags & DIM_CHANGED) {
            gl.bindBuffer(gl.ARRAY_BUFFER, dimensionsBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, dimensions);
        }

        if (changeFlags & SUB_IMG_CHANGED) {
            gl.bindBuffer(gl.ARRAY_BUFFER, subImageBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, subImages);
        }

        changeFlags = NO_CHANGES;

        gl.clearColor(1.0, 0.0, 1.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, highIndex + 1);
    }
}

/*
 * playground: test scene
 */
function runTestScene() {
    const aceOfSpades = createSprite(SubImage.CARD_SA, 0, 0);
    const scalingRef = createScaleAnimation(aceOfSpades, 60 * 5, 5, EASE_IN_OUT_QUINT);
    loopScaleAnimation(scalingRef >> VERSION_BITS);
    delayScaleAnimation(scalingRef >> VERSION_BITS, 60 * 2);
    setScaleAnimationCallback(scalingRef >> VERSION_BITS, () => console.log('scaling done'));
}
