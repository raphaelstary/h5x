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
    positions[idx * POS_ELEMENTS] = x;

    changeFlags |= POS_CHANGED;
}

function getX(idx) {
    return positions[idx * POS_ELEMENTS];
}

function setY(idx, y) {
    positions[idx * POS_ELEMENTS + 1] = y;

    changeFlags |= POS_CHANGED;
}

function getY(idx) {
    return positions[idx * POS_ELEMENTS + 1];
}

function setZ(idx, z) {
    positions[idx * POS_ELEMENTS + 2] = z;

    changeFlags |= POS_CHANGED;
}

function getZ(idx) {
    return positions[idx * POS_ELEMENTS + 2];
}

function setColor(idx, r, g, b, a) {
    colors[idx * COLOR_ELEMENTS] = r;
    colors[idx * COLOR_ELEMENTS + 1] = g;
    colors[idx * COLOR_ELEMENTS + 2] = b;
    colors[idx * COLOR_ELEMENTS + 3] = a;

    changeFlags |= COLORS_CHANGED;
}

function setRed(idx, r) {
    colors[idx * COLOR_ELEMENTS] = r;

    changeFlags |= COLORS_CHANGED;
}

function getRed(idx) {
    return colors[idx * COLOR_ELEMENTS];
}

function setGreen(idx, g) {
    colors[idx * COLOR_ELEMENTS + 1] = g;

    changeFlags |= COLORS_CHANGED;
}

function getGreen(idx) {
    return colors[idx * COLOR_ELEMENTS + 1];
}

function setBlue(idx, b) {
    colors[idx * COLOR_ELEMENTS + 2] = b;

    changeFlags |= COLORS_CHANGED;
}

function getBlue(idx) {
    return colors[idx * COLOR_ELEMENTS + 2];
}

function setAlpha(idx, a) {
    colors[idx * COLOR_ELEMENTS + 3] = a;

    changeFlags |= COLORS_CHANGED;
}

function getAlpha(idx) {
    return colors[idx * COLOR_ELEMENTS + 3];
}

function setRotationX(idx, rotation) {
    xforms[idx * XFORMS_ELEMENTS] = rotation;

    changeFlags |= COLORS_CHANGED;
}

function getRotationX(idx) {
    return xforms[idx * XFORMS_ELEMENTS];
}

function setRotationY(idx, rotation) {
    xforms[idx * XFORMS_ELEMENTS + 1] = rotation;

    changeFlags |= XFORMS_CHANGED;
}

function getRotationY(idx) {
    return xforms[idx * XFORMS_ELEMENTS + 1];
}

function setRotationZ(idx, rotation) {
    xforms[idx * XFORMS_ELEMENTS + 2] = rotation;

    changeFlags |= XFORMS_CHANGED;
}

function getRotationZ(idx) {
    return xforms[idx * XFORMS_ELEMENTS + 2];
}

function setScale(idx, scale) {
    xforms[idx * XFORMS_ELEMENTS + 3] = scale;

    changeFlags |= XFORMS_CHANGED;
}

function getScale(idx) {
    return xforms[idx * XFORMS_ELEMENTS + 3];
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
 * RENDERER API
 */
function drawFrame() {
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

/*
 * ANIMATION
 */
function normalize(x, min, max) {
    return (x - min) / (max - min);
}

function scale(x, min, max) {
    return x * (max - min) + min;
}

// aka funky 1D normalized nonlinear transformation
function easing(x) {
    return x * x;
}

function linearMap(x, minX, maxX, minY, maxY) {
    const n = normalize(x, minX, minY);
    const z = easing(n);
    return scale(z, minY, maxY);
}

/*
 * EVENT LOOP
 */
function eventLoop() {
    requestAnimationFrame(eventLoop);

    // const idx = getIndex(aceOfSpades);
    // if (idx != INVALID_INDEX) {
    //     setScale(idx, getScale(idx) + 0.1);
    // }

    drawFrame();
}

/*
 * playground: test scene
 */
let aceOfSpades;

function runTestScene() {
    aceOfSpades = createSprite(SubImage.CARD_SA, 0, 0);
}
