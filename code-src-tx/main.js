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

const SPRITE_ELEMENTS = 2;
const SPRITE_VERSION_N_STATE_OFFSET = 0;
const SPRITE_ANIMS_OFFSET = 1;

// info flags
const SPRITE_SCALE_ANIM_FLAG = 0b0000000000000001;
const SPRITE_ROT1D_X_ANIM_FLAG = 0b0000000000000010;
const SPRITE_ROT1D_Y_ANIM_FLAG = 0b0000000000000100;
const SPRITE_ROT1D_Z_ANIM_FLAG = 0b0000000000001000;
const SPRITE_COLOR1C_ANIM_FLAG = 0b0000000000010000;
const SPRITE_POS_LIN_ANIM_FLAG = 0b0000000000100000;
const SPRITE_POS_CUR_ANIM_FLAG = 0b0000000001000000;


const sprites = new Uint16Array(MAX_ELEMENTS * SPRITE_ELEMENTS);
console.log(`sprite store size: ${(sprites.byteLength / 1024).toFixed(2)} kb`);


/*
 * SPRITE API
 */
const Sprites = {
    getIndex: function getIndex(id) {
        const idx = id >> VERSION_BITS;
        const version = id & VERSION_MASK;
        const currentVersion = sprites[idx * SPRITE_ELEMENTS + SPRITE_VERSION_N_STATE_OFFSET] >> 1;

        if (version == currentVersion)
            return idx;
        return INVALID_INDEX;
    }
    ,
    create: function createSprite(imgId, x, y) {
        let idx;
        let version;

        for (idx = 0; idx < sprites.length; idx++) {

            const offset = idx * SPRITE_ELEMENTS;
            const flags = sprites[offset];

            if (!(flags & ACTIVE_FLAG)) {

                version = flags >> 1;
                sprites[offset] = flags | ACTIVE_FLAG;
                sprites[offset + SPRITE_ANIMS_OFFSET] = 0;

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
    ,
    setFlag: function setAnimationFlag(idx, flag) {
        sprites[idx * SPRITE_ELEMENTS + SPRITE_ANIMS_OFFSET] |= flag;
    }
    ,
    clearFlag: function clearAnimationFlag(idx, flag) {
        sprites[idx * SPRITE_ELEMENTS + SPRITE_ANIMS_OFFSET] &= ~flag;
    }
    ,
    remove: function deleteSprite(idx) {
        spriteCount--;

        let currentVersion = sprites[idx * SPRITE_ELEMENTS] >> 1;

        if (currentVersion < MAX_VERSION) {
            currentVersion++; // increase version
            sprites[idx * SPRITE_ELEMENTS] = currentVersion << 1; // clear active flag -> set inactive

            const animFlags = sprites[idx * SPRITE_ELEMENTS + SPRITE_ANIMS_OFFSET];
            if (animFlags & SPRITE_SCALE_ANIM_FLAG) {
                ScaleAnimations.remove();
            }


        } else {
            console.log(`sprite @${idx} is at max version`);
        }

        this.setZ(idx, 1.0);

        if (lowIndex == idx) {
            for (let i = idx; i < sprites.length; i++) {
                if (sprites[i * SPRITE_ELEMENTS] & ACTIVE_FLAG) {
                    lowIndex = i;
                    break;
                }
            }
        }

        if (highIndex == idx) {
            for (let i = idx; i >= 0; i--) {
                if (sprites[i * SPRITE_ELEMENTS] & ACTIVE_FLAG) {
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
    ,
    setX: function setX(idx, x) {
        positions[idx * POS_ELEMENTS + POS_X_OFFSET] = x;

        changeFlags |= POS_CHANGED;
    }
    ,
    getX: function getX(idx) {
        return positions[idx * POS_ELEMENTS + POS_X_OFFSET];
    }
    ,
    setY: function setY(idx, y) {
        positions[idx * POS_ELEMENTS + POS_Y_OFFSET] = y;

        changeFlags |= POS_CHANGED;
    }
    ,
    getY: function getY(idx) {
        return positions[idx * POS_ELEMENTS + POS_Y_OFFSET];
    }
    ,
    setZ: function setZ(idx, z) {
        positions[idx * POS_ELEMENTS + POS_Z_OFFSET] = z;

        changeFlags |= POS_CHANGED;
    }
    ,
    getZ: function getZ(idx) {
        return positions[idx * POS_ELEMENTS + POS_Z_OFFSET];
    }
    ,
    setColor: function setColor(idx, r, g, b, a) {
        colors[idx * COLOR_ELEMENTS + COLOR_RED_OFFSET] = r;
        colors[idx * COLOR_ELEMENTS + COLOR_GREEN_OFFSET] = g;
        colors[idx * COLOR_ELEMENTS + COLOR_BLUE_OFFSET] = b;
        colors[idx * COLOR_ELEMENTS + COLOR_ALPHA_OFFSET] = a;

        changeFlags |= COLORS_CHANGED;
    }
    ,
    setRed: function setRed(idx, r) {
        colors[idx * COLOR_ELEMENTS + COLOR_RED_OFFSET] = r;

        changeFlags |= COLORS_CHANGED;
    }
    ,
    getRed: function getRed(idx) {
        return colors[idx * COLOR_ELEMENTS + COLOR_RED_OFFSET];
    }
    ,
    setGreen: function setGreen(idx, g) {
        colors[idx * COLOR_ELEMENTS + COLOR_GREEN_OFFSET] = g;

        changeFlags |= COLORS_CHANGED;
    }
    ,
    getGreen: function getGreen(idx) {
        return colors[idx * COLOR_ELEMENTS + COLOR_GREEN_OFFSET];
    }
    ,
    setBlue: function setBlue(idx, b) {
        colors[idx * COLOR_ELEMENTS + COLOR_BLUE_OFFSET] = b;

        changeFlags |= COLORS_CHANGED;
    }
    ,
    getBlue: function getBlue(idx) {
        return colors[idx * COLOR_ELEMENTS + COLOR_BLUE_OFFSET];
    }
    ,
    setAlpha: function setAlpha(idx, a) {
        colors[idx * COLOR_ELEMENTS + COLOR_ALPHA_OFFSET] = a;

        changeFlags |= COLORS_CHANGED;
    }
    ,
    getAlpha: function getAlpha(idx) {
        return colors[idx * COLOR_ELEMENTS + COLOR_ALPHA_OFFSET];
    }
    ,
    setRotationX: function setRotationX(idx, rotation) {
        xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_X_OFFSET] = rotation;

        changeFlags |= COLORS_CHANGED;
    }
    ,
    getRotationX: function getRotationX(idx) {
        return xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_X_OFFSET];
    }
    ,
    setRotationY: function setRotationY(idx, rotation) {
        xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_Y_OFFSET] = rotation;

        changeFlags |= XFORMS_CHANGED;
    }
    ,
    getRotationY: function getRotationY(idx) {
        return xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_Y_OFFSET];
    }
    ,
    setRotationZ: function setRotationZ(idx, rotation) {
        xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_Z_OFFSET] = rotation;

        changeFlags |= XFORMS_CHANGED;
    }
    ,
    getRotationZ: function getRotationZ(idx) {
        return xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_Z_OFFSET];
    }
    ,
    setScale: function setScale(idx, scale) {
        xforms[idx * XFORMS_ELEMENTS + XFORMS_SCALE_OFFSET] = scale;

        changeFlags |= XFORMS_CHANGED;
    }
    ,
    getScale: function getScale(idx) {
        return xforms[idx * XFORMS_ELEMENTS + XFORMS_SCALE_OFFSET];
    }
    ,
    setSubImage: function setSubImage(idx, imgId) {
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
    ,
    getWidthHalf: function getWidthHalf(idx) {
        return dimensions[idx * DIM_ELEMENTS];
    }
    ,
    getHeightHalf: function getHeightHalf(idx) {
        return dimensions[idx * DIM_ELEMENTS + 1];
    }
};

/*
 * ANIMATION
 */
const callbacks = {};


const ANIM_SCALE_MAX_ELEMENTS = 1 << 13;
const ANIM_SCALE_BYTES_PER_ELEMENT = 24;
const ANIM_SCALE_BUFFER_SIZE = ANIM_SCALE_BYTES_PER_ELEMENT * ANIM_SCALE_MAX_ELEMENTS;

const animScaleBuffer = new ArrayBuffer(ANIM_SCALE_BUFFER_SIZE);
const scaleAnims = new DataView(animScaleBuffer);
let animScaleCount = 0;
let animScaleMinIdx = 0;
let animScaleMaxIdx = 0;

const ANIM_SCALE_VERSION_N_STATE_OFFSET = 0; // 2 byte
const ANIM_SCALE_TIMING_N_INFO_OFFSET = 2; // 2 byte
const ANIM_SCALE_SPRITE_OFFSET = 4; // 4 byte
const ANIM_SCALE_START_OFFSET = 8; // 4 byte
const ANIM_SCALE_END_OFFSET = 12; // 4 byte
const ANIM_SCALE_FROM_OFFSET = 16; // 4 byte
const ANIM_SCALE_TO_OFFSET = 20; // 4 byte

const ANIM_SCALE_INFO_BITS = 2;
// info flags
const ANIM_SCALE_CALLBACK_FLAG = 0b0000000000000001;
const ANIM_SCALE_LOOP_FLAG = 0b0000000000000010;

const ANIM_SCALE_CB_KEY = 'anim-scale-';

const ScaleAnimations = {
    getIndex: function getScaleAnimIndex(id) {
        const idx = id >> VERSION_BITS;
        const version = id & VERSION_MASK;
        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT + ANIM_SCALE_VERSION_N_STATE_OFFSET;
        const currentVersion = scaleAnims.getUint16(offset) >> 1;

        if (version == currentVersion)
            return idx;
        return INVALID_INDEX;
    }
    ,
    create: function createScaleAnim(sprite, duration, toValue, timing) {
        let idx;
        let version;
        for (idx = 0; idx < ANIM_SCALE_MAX_ELEMENTS; idx++) {

            const flags = scaleAnims.getUint16(idx * ANIM_SCALE_BYTES_PER_ELEMENT + ANIM_SCALE_VERSION_N_STATE_OFFSET);

            if (!(flags & ACTIVE_FLAG)) {

                version = flags >> 1;
                scaleAnims.setUint16(idx * ANIM_SCALE_BYTES_PER_ELEMENT + ANIM_SCALE_VERSION_N_STATE_OFFSET, flags | ACTIVE_FLAG);

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

        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;

        scaleAnims.setUint16(offset + ANIM_SCALE_TIMING_N_INFO_OFFSET, timing << ANIM_SCALE_INFO_BITS);

        scaleAnims.setUint32(offset + ANIM_SCALE_SPRITE_OFFSET, sprite);
        scaleAnims.setUint32(offset + ANIM_SCALE_START_OFFSET, frame);
        scaleAnims.setUint32(offset + ANIM_SCALE_END_OFFSET, frame + duration);
        const spriteIdx = sprite >> VERSION_BITS;
        scaleAnims.setFloat32(offset + ANIM_SCALE_FROM_OFFSET, Sprites.getScale(spriteIdx));
        scaleAnims.setFloat32(offset + ANIM_SCALE_TO_OFFSET, toValue);

        Sprites.setFlag(spriteIdx, SPRITE_SCALE_ANIM_FLAG);

        return idx << VERSION_BITS | version;
    }
    ,
    setLoop: function setLoopScaleAnim(idx, loop) {
        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;
        const info = scaleAnims.getUint16(offset + ANIM_SCALE_TIMING_N_INFO_OFFSET);

        scaleAnims.setUint16(offset + ANIM_SCALE_TIMING_N_INFO_OFFSET, loop ? info | ANIM_SCALE_LOOP_FLAG : info & ~ANIM_SCALE_LOOP_FLAG);
    }
    ,
    setCallback: function setScaleAnimCallback(idx, callback) {
        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;
        const info = scaleAnims.getUint16(offset + ANIM_SCALE_TIMING_N_INFO_OFFSET);

        scaleAnims.setUint16(offset + ANIM_SCALE_TIMING_N_INFO_OFFSET, info | ANIM_SCALE_CALLBACK_FLAG);
        callbacks[ANIM_SCALE_CB_KEY + idx] = callback;
    }
    ,
    restart: function restartScaleAnim(idx) {
        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;
        const duration = scaleAnims.getUint32(offset + ANIM_SCALE_END_OFFSET) - scaleAnims.getUint32(offset + ANIM_SCALE_START_OFFSET);
        scaleAnims.setUint32(offset + ANIM_SCALE_START_OFFSET, frame);
        scaleAnims.setUint32(offset + ANIM_SCALE_END_OFFSET, frame + duration);
    }
    ,
    delay: function delayScaleAnim(idx, duration) {
        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;
        const length = scaleAnims.getUint32(offset + ANIM_SCALE_END_OFFSET) - scaleAnims.getUint32(offset + ANIM_SCALE_START_OFFSET);
        scaleAnims.setUint32(offset + ANIM_SCALE_START_OFFSET, frame + duration);
        scaleAnims.setUint32(offset + ANIM_SCALE_END_OFFSET, frame + duration + length);
    }
    ,
    remove: function deleteScaleAnim(idx) {
        animScaleCount--;

        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT + ANIM_SCALE_VERSION_N_STATE_OFFSET;

        let currentVersion = scaleAnims.getUint16(offset) >> 1;

        if (currentVersion < MAX_VERSION) {
            currentVersion++; // increase version
            scaleAnims.setUint16(offset, currentVersion << 1);

        } else {
            console.log(`scale animation @${idx} is at max version`);
        }

        if (animScaleMinIdx == idx) {
            for (let i = idx; i <= animScaleMaxIdx; i++) {
                if (scaleAnims.getUint16(i * ANIM_SCALE_BYTES_PER_ELEMENT + ANIM_SCALE_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    animScaleMinIdx = i;
                    break;
                }
            }
            if (animScaleMinIdx == idx)
                animScaleMinIdx = animScaleMaxIdx;
        }

        if (animScaleMaxIdx == idx) {
            for (let i = idx; i >= animScaleMinIdx; i--) {
                if (scaleAnims.getUint16(i * ANIM_SCALE_BYTES_PER_ELEMENT + ANIM_SCALE_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    animScaleMaxIdx = i;
                    break;
                }
            }
            if (animScaleMaxIdx == idx)
                animScaleMaxIdx = animScaleMinIdx;
        }

        const sprite = scaleAnims.getUint32(offset + ANIM_SCALE_SPRITE_OFFSET);
        Sprites.clearFlag(sprite >> VERSION_BITS, SPRITE_SCALE_ANIM_FLAG);
    }
    ,
    removeBy: function deleteScaleAnimBySprite(sprite) {
        let idx;
        for (idx = 0; idx < ANIM_SCALE_MAX_ELEMENTS; idx++) {

            const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;
            const flags = scaleAnims.getUint16(offset + ANIM_SCALE_VERSION_N_STATE_OFFSET);

            if (flags & ACTIVE_FLAG && sprite == scaleAnims.getUint32(offset + ANIM_SCALE_SPRITE_OFFSET, sprite)) {
                this.remove(idx);
                break;
            }
        }
    }
};

const ANIM_ROT1D_MAX_ELEMENTS = 1 << 13;
const ANIM_ROT1D_BYTES_PER_ELEMENT = 24;
const ANIM_ROT1D_BUFFER_SIZE = ANIM_ROT1D_BYTES_PER_ELEMENT * ANIM_ROT1D_MAX_ELEMENTS;

const animRot1DBuffer = new ArrayBuffer(ANIM_ROT1D_BUFFER_SIZE);
const rot1DAnims = new DataView(animRot1DBuffer);
let animRot1DCount = 0;
let animRot1DMinIdx = 0;
let animRot1DMaxIdx = 0;

const ANIM_ROT1D_VERSION_N_STATE_OFFSET = 0; // 2 byte
const ANIM_ROT1D_TIMING_N_INFO_OFFSET = 2; // 2 byte
const ANIM_ROT1D_SPRITE_OFFSET = 4; // 4 byte
const ANIM_ROT1D_START_OFFSET = 8; // 4 byte
const ANIM_ROT1D_END_OFFSET = 12; // 4 byte
const ANIM_ROT1D_FROM_OFFSET = 16; // 4 byte
const ANIM_ROT1D_TO_OFFSET = 20; // 4 byte

const ANIM_ROT1D_INFO_BITS = 5;
// info flags
const ANIM_ROT1D_CALLBACK_FLAG = 0b0000000000000001;
const ANIM_ROT1D_LOOP_FLAG = 0b0000000000000010;
const ANIM_ROT1D_X_FLAG = 0b0000000000000100;
const ANIM_ROT1D_Y_FLAG = 0b0000000000001000;
const ANIM_ROT1D_Z_FLAG = 0b0000000000010000;

const ANIM_ROT1D_CB_KEY = 'anim-rot1d-';

const Rot1DAnimations = {
    getIndex: function getRot1DAnimIndex(id) {
        const idx = id >> VERSION_BITS;
        const version = id & VERSION_MASK;
        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT + ANIM_ROT1D_VERSION_N_STATE_OFFSET;
        const currentVersion = rot1DAnims.getUint16(offset) >> 1;

        if (version == currentVersion)
            return idx;
        return INVALID_INDEX;
    }
    ,
    create: function createRot1DAnim(sprite, property, duration, toValue, timing) {
        let idx;
        let version;
        for (idx = 0; idx < ANIM_ROT1D_MAX_ELEMENTS; idx++) {

            const flags = rot1DAnims.getUint16(idx * ANIM_ROT1D_BYTES_PER_ELEMENT + ANIM_ROT1D_VERSION_N_STATE_OFFSET);

            if (!(flags & ACTIVE_FLAG)) {

                version = flags >> 1;
                rot1DAnims.setUint16(idx * ANIM_ROT1D_BYTES_PER_ELEMENT + ANIM_ROT1D_VERSION_N_STATE_OFFSET, flags | ACTIVE_FLAG);

                break;
            }
        }

        if (idx == undefined)
            throw new Error('could not create new rot1d animation, probably no space left');

        animRot1DCount++;

        if (animRot1DMinIdx > idx)
            animRot1DMinIdx = idx;

        if (animRot1DMaxIdx < idx)
            animRot1DMaxIdx = idx;

        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;

        rot1DAnims.setUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET, timing << ANIM_ROT1D_INFO_BITS | property);

        rot1DAnims.setUint32(offset + ANIM_ROT1D_SPRITE_OFFSET, sprite);
        rot1DAnims.setUint32(offset + ANIM_ROT1D_START_OFFSET, frame);
        rot1DAnims.setUint32(offset + ANIM_ROT1D_END_OFFSET, frame + duration);

        const spriteIdx = sprite >> VERSION_BITS;
        if (property & ANIM_ROT1D_X_FLAG) {
            rot1DAnims.setFloat32(offset + ANIM_ROT1D_FROM_OFFSET, Sprites.getRotationX(spriteIdx));
            Sprites.setFlag(spriteIdx, SPRITE_ROT1D_X_ANIM_FLAG);
        } else if (property & ANIM_ROT1D_Y_FLAG) {
            rot1DAnims.setFloat32(offset + ANIM_ROT1D_FROM_OFFSET, Sprites.getRotationY(spriteIdx));
            Sprites.setFlag(spriteIdx, SPRITE_ROT1D_Y_ANIM_FLAG);
        } else if (property & ANIM_ROT1D_Z_FLAG) {
            rot1DAnims.setFloat32(offset + ANIM_ROT1D_FROM_OFFSET, Sprites.getRotationZ(spriteIdx));
            Sprites.setFlag(spriteIdx, SPRITE_ROT1D_Z_ANIM_FLAG);
        }

        rot1DAnims.setFloat32(offset + ANIM_ROT1D_TO_OFFSET, toValue);

        return idx << VERSION_BITS | version;
    }
    ,
    setLoop: function setLoopRot1DAnim(idx, loop) {
        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;
        const info = rot1DAnims.getUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET);

        rot1DAnims.setUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET, loop ? info | ANIM_ROT1D_LOOP_FLAG : info & ~ANIM_ROT1D_LOOP_FLAG);
    }
    ,
    setCallback: function setRot1DAnimCallback(idx, callback) {
        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;
        const info = rot1DAnims.getUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET);

        rot1DAnims.setUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET, info | ANIM_ROT1D_CALLBACK_FLAG);
        callbacks[ANIM_ROT1D_CB_KEY + idx] = callback;
    }
    ,
    restart: function restartRot1DAnim(idx) {
        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;
        const duration = rot1DAnims.getUint32(offset + ANIM_ROT1D_END_OFFSET) - rot1DAnims.getUint32(offset + ANIM_ROT1D_START_OFFSET);
        rot1DAnims.setUint32(offset + ANIM_ROT1D_START_OFFSET, frame);
        rot1DAnims.setUint32(offset + ANIM_ROT1D_END_OFFSET, frame + duration);
    }
    ,
    delay: function delayRot1DAnim(idx, duration) {
        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;
        const length = rot1DAnims.getUint32(offset + ANIM_ROT1D_END_OFFSET) - rot1DAnims.getUint32(offset + ANIM_ROT1D_START_OFFSET);
        rot1DAnims.setUint32(offset + ANIM_ROT1D_START_OFFSET, frame + duration);
        rot1DAnims.setUint32(offset + ANIM_ROT1D_END_OFFSET, frame + duration + length);
    }
    ,
    remove: function deleteRot1DAnim(idx) {
        animRot1DCount--;

        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT + ANIM_ROT1D_VERSION_N_STATE_OFFSET;

        let currentVersion = rot1DAnims.getUint16(offset) >> 1;

        if (currentVersion < MAX_VERSION) {
            currentVersion++; // increase version
            rot1DAnims.setUint16(offset, currentVersion << 1);

        } else {
            console.log(`rot1d animation @${idx} is at max version`);
        }

        if (animRot1DMinIdx == idx) {
            for (let i = idx; i <= animRot1DMaxIdx; i++) {
                if (rot1DAnims.getUint16(i * ANIM_ROT1D_BYTES_PER_ELEMENT + ANIM_ROT1D_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    animRot1DMinIdx = i;
                    break;
                }
            }
            if (animRot1DMinIdx == idx)
                animRot1DMinIdx = animRot1DMaxIdx;
        }

        if (animRot1DMaxIdx == idx) {
            for (let i = idx; i >= animRot1DMinIdx; i--) {
                if (rot1DAnims.getUint16(i * ANIM_ROT1D_BYTES_PER_ELEMENT + ANIM_ROT1D_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    animRot1DMaxIdx = i;
                    break;
                }
            }
            if (animRot1DMaxIdx == idx)
                animRot1DMaxIdx = animRot1DMinIdx;
        }


        const spriteIdx = rot1DAnims.getUint32(offset + ANIM_ROT1D_SPRITE_OFFSET) >> VERSION_BITS;
        const info = rot1DAnims.getUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET);
        if (info & ANIM_ROT1D_X_FLAG)
            Sprites.clearFlag(spriteIdx, SPRITE_ROT1D_X_ANIM_FLAG);
        else if (info & ANIM_ROT1D_Y_FLAG)
            Sprites.clearFlag(spriteIdx, SPRITE_ROT1D_Y_ANIM_FLAG);
        else if (info & ANIM_ROT1D_Z_FLAG)
            Sprites.clearFlag(spriteIdx, SPRITE_ROT1D_Z_ANIM_FLAG);
    }
    ,
    removeBy: function deleteRot1DAnimBySprite(sprite, deleteCount) {
        let idx;
        let count = 0;
        for (idx = 0; idx < ANIM_ROT1D_MAX_ELEMENTS; idx++) {

            const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;
            const flags = rot1DAnims.getUint16(offset + ANIM_ROT1D_VERSION_N_STATE_OFFSET);

            if (flags & ACTIVE_FLAG && sprite == rot1DAnims.getUint32(offset + ANIM_ROT1D_SPRITE_OFFSET, sprite)) {
                this.remove(idx);
                if (++count == deleteCount)
                    break;
            }
        }
    }
};


const ANIM_COLOR1C_MAX_ELEMENTS = 1 << 13;
const ANIM_COLOR1C_BYTES_PER_ELEMENT = 24;
const ANIM_COLOR1C_BUFFER_SIZE = ANIM_COLOR1C_BYTES_PER_ELEMENT * ANIM_COLOR1C_MAX_ELEMENTS;

const animColor1CBuffer = new ArrayBuffer(ANIM_COLOR1C_BUFFER_SIZE);
const color1CAnims = new DataView(animColor1CBuffer);
let animColor1CCount = 0;
let animColor1CMinIdx = 0;
let animColor1CMaxIdx = 0;

const ANIM_COLOR1C_VERSION_N_STATE_OFFSET = 0; // 2 byte
const ANIM_COLOR1C_TIMING_N_INFO_OFFSET = 2; // 2 byte
const ANIM_COLOR1C_SPRITE_OFFSET = 4; // 4 byte
const ANIM_COLOR1C_START_OFFSET = 8; // 4 byte
const ANIM_COLOR1C_END_OFFSET = 12; // 4 byte
const ANIM_COLOR1C_FROM_OFFSET = 16; // 4 byte
const ANIM_COLOR1C_TO_OFFSET = 20; // 4 byte

const ANIM_COLOR1C_INFO_BITS = 2;
// info flags
const ANIM_COLOR1C_CALLBACK_FLAG = 0b0000000000000001;
const ANIM_COLOR1C_LOOP_FLAG = 0b0000000000000010;

const ANIM_COLOR1C_CB_KEY = 'anim-color1c-';

const Color1CAnimations = {
    getIndex: function getColor1CAnimIndex(id) {
        const idx = id >> VERSION_BITS;
        const version = id & VERSION_MASK;
        const offset = idx * ANIM_COLOR1C_BYTES_PER_ELEMENT + ANIM_COLOR1C_VERSION_N_STATE_OFFSET;
        const currentVersion = color1CAnims.getUint16(offset) >> 1;

        if (version == currentVersion)
            return idx;
        return INVALID_INDEX;
    }
    ,
    create: function createColor1CAnim(sprite, duration, toValue, timing) {
        let idx;
        let version;
        for (idx = 0; idx < ANIM_COLOR1C_MAX_ELEMENTS; idx++) {

            const flags = color1CAnims.getUint16(idx * ANIM_COLOR1C_BYTES_PER_ELEMENT + ANIM_COLOR1C_VERSION_N_STATE_OFFSET);

            if (!(flags & ACTIVE_FLAG)) {

                version = flags >> 1;
                color1CAnims.setUint16(idx * ANIM_COLOR1C_BYTES_PER_ELEMENT + ANIM_COLOR1C_VERSION_N_STATE_OFFSET, flags | ACTIVE_FLAG);

                break;
            }
        }

        if (idx == undefined)
            throw new Error('could not create new color1c animation, probably no space left');

        animColor1CCount++;

        if (animColor1CMinIdx > idx)
            animColor1CMinIdx = idx;

        if (animColor1CMaxIdx < idx)
            animColor1CMaxIdx = idx;

        const offset = idx * ANIM_COLOR1C_BYTES_PER_ELEMENT;

        color1CAnims.setUint16(offset + ANIM_COLOR1C_TIMING_N_INFO_OFFSET, timing << ANIM_COLOR1C_INFO_BITS);

        color1CAnims.setUint32(offset + ANIM_COLOR1C_SPRITE_OFFSET, sprite);
        color1CAnims.setUint32(offset + ANIM_COLOR1C_START_OFFSET, frame);
        color1CAnims.setUint32(offset + ANIM_COLOR1C_END_OFFSET, frame + duration);
        // currently only ALPHA CHANNEL !!!
        const spriteIdx = sprite >> VERSION_BITS;
        color1CAnims.setFloat32(offset + ANIM_COLOR1C_FROM_OFFSET, Sprites.getAlpha(spriteIdx));
        color1CAnims.setFloat32(offset + ANIM_COLOR1C_TO_OFFSET, toValue);

        Sprites.setFlag(spriteIdx, SPRITE_COLOR1C_ANIM_FLAG);

        return idx << VERSION_BITS | version;
    }
    ,
    setLoop: function setLoopColor1CAnim(idx, loop) {
        const offset = idx * ANIM_COLOR1C_BYTES_PER_ELEMENT;
        const info = color1CAnims.getUint16(offset + ANIM_COLOR1C_TIMING_N_INFO_OFFSET);

        color1CAnims.setUint16(offset + ANIM_COLOR1C_TIMING_N_INFO_OFFSET, loop ? info | ANIM_COLOR1C_LOOP_FLAG : info & ~ANIM_COLOR1C_LOOP_FLAG);
    }
    ,
    setCallback: function setColor1CAnimCallback(idx, callback) {
        const offset = idx * ANIM_COLOR1C_BYTES_PER_ELEMENT;
        const info = color1CAnims.getUint16(offset + ANIM_COLOR1C_TIMING_N_INFO_OFFSET);

        color1CAnims.setUint16(offset + ANIM_COLOR1C_TIMING_N_INFO_OFFSET, info | ANIM_COLOR1C_CALLBACK_FLAG);
        callbacks[ANIM_COLOR1C_CB_KEY + idx] = callback;
    }
    ,
    restart: function restartColor1CAnim(idx) {
        const offset = idx * ANIM_COLOR1C_BYTES_PER_ELEMENT;
        const duration = color1CAnims.getUint32(offset + ANIM_COLOR1C_END_OFFSET) - color1CAnims.getUint32(offset + ANIM_COLOR1C_START_OFFSET);
        color1CAnims.setUint32(offset + ANIM_COLOR1C_START_OFFSET, frame);
        color1CAnims.setUint32(offset + ANIM_COLOR1C_END_OFFSET, frame + duration);
    }
    ,
    delay: function delayColor1CAnim(idx, duration) {
        const offset = idx * ANIM_COLOR1C_BYTES_PER_ELEMENT;
        const length = color1CAnims.getUint32(offset + ANIM_COLOR1C_END_OFFSET) - color1CAnims.getUint32(offset + ANIM_COLOR1C_START_OFFSET);
        color1CAnims.setUint32(offset + ANIM_COLOR1C_START_OFFSET, frame + duration);
        color1CAnims.setUint32(offset + ANIM_COLOR1C_END_OFFSET, frame + duration + length);
    }
    ,
    remove: function deleteColor1CAnim(idx) {
        animColor1CCount--;

        const offset = idx * ANIM_COLOR1C_BYTES_PER_ELEMENT + ANIM_COLOR1C_VERSION_N_STATE_OFFSET;

        let currentVersion = color1CAnims.getUint16(offset) >> 1;

        if (currentVersion < MAX_VERSION) {
            currentVersion++; // increase version
            color1CAnims.setUint16(offset, currentVersion << 1);

        } else {
            console.log(`color1c animation @${idx} is at max version`);
        }

        if (animColor1CMinIdx == idx) {
            for (let i = idx; i <= animColor1CMaxIdx; i++) {
                if (color1CAnims.getUint16(i * ANIM_COLOR1C_BYTES_PER_ELEMENT + ANIM_COLOR1C_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    animColor1CMinIdx = i;
                    break;
                }
            }
            if (animColor1CMinIdx == idx)
                animColor1CMinIdx = animColor1CMaxIdx;
        }

        if (animColor1CMaxIdx == idx) {
            for (let i = idx; i >= animColor1CMinIdx; i--) {
                if (color1CAnims.getUint16(i * ANIM_COLOR1C_BYTES_PER_ELEMENT + ANIM_COLOR1C_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    animColor1CMaxIdx = i;
                    break;
                }
            }
            if (animColor1CMaxIdx == idx)
                animColor1CMaxIdx = animColor1CMinIdx;
        }

        const sprite = color1CAnims.getUint32(offset + ANIM_COLOR1C_SPRITE_OFFSET);
        Sprites.clearFlag(sprite >> VERSION_BITS, SPRITE_COLOR1C_ANIM_FLAG);
    }
    ,
    removeBy: function deleteColor1CAnimBySprite(sprite) {
        let idx;
        for (idx = 0; idx < ANIM_COLOR1C_MAX_ELEMENTS; idx++) {

            const offset = idx * ANIM_COLOR1C_BYTES_PER_ELEMENT;
            const flags = color1CAnims.getUint16(offset + ANIM_COLOR1C_VERSION_N_STATE_OFFSET);

            if (flags & ACTIVE_FLAG && sprite == color1CAnims.getUint32(offset + ANIM_COLOR1C_SPRITE_OFFSET, sprite)) {
                this.remove(idx);
                break;
            }
        }
    }
};


const ANIM_POS_MAX_ELEMENTS = 1 << 13;
const ANIM_POS_BYTES_PER_ELEMENT = 40;
const ANIM_POS_BUFFER_SIZE = ANIM_POS_BYTES_PER_ELEMENT * ANIM_POS_MAX_ELEMENTS;

const animPosBuffer = new ArrayBuffer(ANIM_POS_BUFFER_SIZE);
const posAnims = new DataView(animPosBuffer);
let animPosCount = 0;
let animPosMinIdx = 0;
let animPosMaxIdx = 0;

const ANIM_POS_VERSION_N_STATE_OFFSET = 0; // 2 byte
const ANIM_POS_TIMING_N_INFO_OFFSET = 2; // 2 byte
const ANIM_POS_SPRITE_OFFSET = 4; // 4 byte
const ANIM_POS_START_OFFSET = 8; // 4 byte
const ANIM_POS_END_OFFSET = 12; // 4 byte
const ANIM_POS_FROM_X_OFFSET = 16; // 4 byte
const ANIM_POS_TO_X_OFFSET = 20; // 4 byte
const ANIM_POS_FROM_Y_OFFSET = 24; // 4 byte
const ANIM_POS_TO_Y_OFFSET = 28; // 4 byte
const ANIM_POS_FROM_Z_OFFSET = 32; // 4 byte
const ANIM_POS_TO_Z_OFFSET = 36; // 4 byte

const ANIM_POS_INFO_BITS = 2;
// info flags
const ANIM_POS_CALLBACK_FLAG = 0b0000000000000001;
const ANIM_POS_LOOP_FLAG = 0b0000000000000010;

const ANIM_POS_CB_KEY = 'anim-pos-';

const PositionAnimations = {
    getIndex: function getPosAnimIndex(id) {
        const idx = id >> VERSION_BITS;
        const version = id & VERSION_MASK;
        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT + ANIM_POS_VERSION_N_STATE_OFFSET;
        const currentVersion = posAnims.getUint16(offset) >> 1;

        if (version == currentVersion)
            return idx;
        return INVALID_INDEX;
    }
    ,
    create: function createPosAnim(sprite, duration, toX, toY, toZ, timing) {
        let idx;
        let version;
        for (idx = 0; idx < ANIM_POS_MAX_ELEMENTS; idx++) {

            const flags = posAnims.getUint16(idx * ANIM_POS_BYTES_PER_ELEMENT + ANIM_POS_VERSION_N_STATE_OFFSET);

            if (!(flags & ACTIVE_FLAG)) {

                version = flags >> 1;
                posAnims.setUint16(idx * ANIM_POS_BYTES_PER_ELEMENT + ANIM_POS_VERSION_N_STATE_OFFSET, flags | ACTIVE_FLAG);

                break;
            }
        }

        if (idx == undefined)
            throw new Error('could not create new position animation, probably no space left');

        animPosCount++;

        if (animPosMinIdx > idx)
            animPosMinIdx = idx;

        if (animPosMaxIdx < idx)
            animPosMaxIdx = idx;

        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;

        posAnims.setUint16(offset + ANIM_POS_TIMING_N_INFO_OFFSET, timing << ANIM_POS_INFO_BITS);

        posAnims.setUint32(offset + ANIM_POS_SPRITE_OFFSET, sprite);
        posAnims.setUint32(offset + ANIM_POS_START_OFFSET, frame);
        posAnims.setUint32(offset + ANIM_POS_END_OFFSET, frame + duration);

        const spriteIdx = sprite >> VERSION_BITS;
        posAnims.setFloat32(offset + ANIM_POS_FROM_X_OFFSET, Sprites.getX(spriteIdx));
        posAnims.setFloat32(offset + ANIM_POS_TO_X_OFFSET, toX);

        posAnims.setFloat32(offset + ANIM_POS_FROM_Y_OFFSET, Sprites.getY(spriteIdx));
        posAnims.setFloat32(offset + ANIM_POS_TO_Y_OFFSET, toY);

        posAnims.setFloat32(offset + ANIM_POS_FROM_Z_OFFSET, Sprites.getZ(spriteIdx));
        posAnims.setFloat32(offset + ANIM_POS_TO_Z_OFFSET, toZ);

        Sprites.setFlag(spriteIdx, SPRITE_POS_LIN_ANIM_FLAG);

        return idx << VERSION_BITS | version;
    }
    ,
    setLoop: function setLoopPosAnim(idx, loop) {
        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;
        const info = posAnims.getUint16(offset + ANIM_POS_TIMING_N_INFO_OFFSET);

        posAnims.setUint16(offset + ANIM_POS_TIMING_N_INFO_OFFSET, loop ? info | ANIM_POS_LOOP_FLAG : info & ~ANIM_POS_LOOP_FLAG);
    }
    ,
    setCallback: function setPosAnimCallback(idx, callback) {
        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;
        const info = posAnims.getUint16(offset + ANIM_POS_TIMING_N_INFO_OFFSET);

        posAnims.setUint16(offset + ANIM_POS_TIMING_N_INFO_OFFSET, info | ANIM_POS_CALLBACK_FLAG);
        callbacks[ANIM_POS_CB_KEY + idx] = callback;
    }
    ,
    restart: function restartPosAnim(idx) {
        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;
        const duration = posAnims.getUint32(offset + ANIM_POS_END_OFFSET) - posAnims.getUint32(offset + ANIM_POS_START_OFFSET);
        posAnims.setUint32(offset + ANIM_POS_START_OFFSET, frame);
        posAnims.setUint32(offset + ANIM_POS_END_OFFSET, frame + duration);
    }
    ,
    delay: function delayPosAnim(idx, duration) {
        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;
        const length = posAnims.getUint32(offset + ANIM_POS_END_OFFSET) - posAnims.getUint32(offset + ANIM_POS_START_OFFSET);
        posAnims.setUint32(offset + ANIM_POS_START_OFFSET, frame + duration);
        posAnims.setUint32(offset + ANIM_POS_END_OFFSET, frame + duration + length);
    }
    ,
    remove: function deletePosAnim(idx) {
        animPosCount--;

        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT + ANIM_POS_VERSION_N_STATE_OFFSET;

        let currentVersion = posAnims.getUint16(offset) >> 1;

        if (currentVersion < MAX_VERSION) {
            currentVersion++; // increase version
            posAnims.setUint16(offset, currentVersion << 1);

        } else {
            console.log(`position animation @${idx} is at max version`);
        }

        if (animPosMinIdx == idx) {
            for (let i = idx; i <= animPosMaxIdx; i++) {
                if (posAnims.getUint16(i * ANIM_POS_BYTES_PER_ELEMENT + ANIM_POS_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    animPosMinIdx = i;
                    break;
                }
            }
            if (animPosMinIdx == idx)
                animPosMinIdx = animPosMaxIdx;
        }

        if (animPosMaxIdx == idx) {
            for (let i = idx; i >= animPosMinIdx; i--) {
                if (posAnims.getUint16(i * ANIM_POS_BYTES_PER_ELEMENT + ANIM_POS_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    animPosMaxIdx = i;
                    break;
                }
            }
            if (animPosMaxIdx == idx)
                animPosMaxIdx = animPosMinIdx;
        }

        const sprite = posAnims.getUint32(offset + ANIM_POS_SPRITE_OFFSET);
        Sprites.clearFlag(sprite >> VERSION_BITS, SPRITE_POS_LIN_ANIM_FLAG);
    }
    ,
    removeBy: function deletePosAnimBySprite(sprite) {
        let idx;
        for (idx = 0; idx < ANIM_POS_MAX_ELEMENTS; idx++) {

            const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;
            const flags = posAnims.getUint16(offset + ANIM_POS_VERSION_N_STATE_OFFSET);

            if (flags & ACTIVE_FLAG && sprite == posAnims.getUint32(offset + ANIM_POS_SPRITE_OFFSET, sprite)) {
                this.remove(idx);
                break;
            }
        }
    }
};


const ANIM_POSC_MAX_ELEMENTS = 1 << 13;
const ANIM_POSC_BYTES_PER_ELEMENT = 64;
const ANIM_POSC_BUFFER_SIZE = ANIM_POSC_BYTES_PER_ELEMENT * ANIM_POSC_MAX_ELEMENTS;

const animPosCBuffer = new ArrayBuffer(ANIM_POSC_BUFFER_SIZE);
const posCAnims = new DataView(animPosCBuffer);
let animPosCCount = 0;
let animPosCMinIdx = 0;
let animPosCMaxIdx = 0;

const ANIM_POSC_VERSION_N_STATE_OFFSET = 0; // 2 byte
const ANIM_POSC_TIMING_N_INFO_OFFSET = 2; // 2 byte

const ANIM_POSC_SPRITE_OFFSET = 4; // 4 byte

const ANIM_POSC_START_OFFSET = 8; // 4 byte
const ANIM_POSC_END_OFFSET = 12; // 4 byte

const ANIM_POSC_A_X_OFFSET = 16; // 4 bytes
const ANIM_POSC_A_Y_OFFSET = 20; // 4 bytes
const ANIM_POSC_A_Z_OFFSET = 24; // 4 bytes

const ANIM_POSC_B_X_OFFSET = 28; // 4 bytes
const ANIM_POSC_B_Y_OFFSET = 32; // 4 bytes
const ANIM_POSC_B_Z_OFFSET = 36; // 4 bytes

const ANIM_POSC_C_X_OFFSET = 40; // 4 bytes
const ANIM_POSC_C_Y_OFFSET = 44; // 4 bytes
const ANIM_POSC_C_Z_OFFSET = 48; // 4 bytes

const ANIM_POSC_D_X_OFFSET = 52; // 4 bytes
const ANIM_POSC_D_Y_OFFSET = 56; // 4 bytes
const ANIM_POSC_D_Z_OFFSET = 60; // 4 bytes


const ANIM_POSC_INFO_BITS = 2;
// info flags
const ANIM_POSC_CALLBACK_FLAG = 0b0000000000000001;
const ANIM_POSC_LOOP_FLAG = 0b0000000000000010;

const ANIM_POSC_CB_KEY = 'anim-posc-';

const PositionCurveAnimations = {
    getIndex: function getPosCAnimIndex(id) {
        const idx = id >> VERSION_BITS;
        const version = id & VERSION_MASK;
        const offset = idx * ANIM_POSC_BYTES_PER_ELEMENT + ANIM_POSC_VERSION_N_STATE_OFFSET;
        const currentVersion = posCAnims.getUint16(offset) >> 1;

        if (version == currentVersion)
            return idx;
        return INVALID_INDEX;
    }
    ,
    create: function createPosCAnim(sprite, duration, bX, bY, bZ, cX, cY, cZ, dX, dY, dZ, timing) {
        let idx;
        let version;
        for (idx = 0; idx < ANIM_POSC_MAX_ELEMENTS; idx++) {

            const flags = posCAnims.getUint16(idx * ANIM_POSC_BYTES_PER_ELEMENT + ANIM_POSC_VERSION_N_STATE_OFFSET);

            if (!(flags & ACTIVE_FLAG)) {

                version = flags >> 1;
                posCAnims.setUint16(idx * ANIM_POSC_BYTES_PER_ELEMENT + ANIM_POSC_VERSION_N_STATE_OFFSET, flags | ACTIVE_FLAG);

                break;
            }
        }

        if (idx == undefined)
            throw new Error('could not create new position curve animation, probably no space left');

        animPosCCount++;

        if (animPosCMinIdx > idx)
            animPosCMinIdx = idx;

        if (animPosCMaxIdx < idx)
            animPosCMaxIdx = idx;

        const offset = idx * ANIM_POSC_BYTES_PER_ELEMENT;

        posCAnims.setUint16(offset + ANIM_POSC_TIMING_N_INFO_OFFSET, timing << ANIM_POSC_INFO_BITS);

        posCAnims.setUint32(offset + ANIM_POSC_SPRITE_OFFSET, sprite);
        posCAnims.setUint32(offset + ANIM_POSC_START_OFFSET, frame);
        posCAnims.setUint32(offset + ANIM_POSC_END_OFFSET, frame + duration);

        const spriteIdx = sprite >> VERSION_BITS;
        posCAnims.setFloat32(offset + ANIM_POSC_A_X_OFFSET, Sprites.getX(spriteIdx));
        posCAnims.setFloat32(offset + ANIM_POSC_A_Y_OFFSET, Sprites.getY(spriteIdx));
        posCAnims.setFloat32(offset + ANIM_POSC_A_Z_OFFSET, Sprites.getZ(spriteIdx));

        posCAnims.setFloat32(offset + ANIM_POSC_B_X_OFFSET, bX);
        posCAnims.setFloat32(offset + ANIM_POSC_B_Y_OFFSET, bY);
        posCAnims.setFloat32(offset + ANIM_POSC_B_Z_OFFSET, bZ);

        posCAnims.setFloat32(offset + ANIM_POSC_C_X_OFFSET, cX);
        posCAnims.setFloat32(offset + ANIM_POSC_C_Y_OFFSET, cY);
        posCAnims.setFloat32(offset + ANIM_POSC_C_Z_OFFSET, cZ);

        posCAnims.setFloat32(offset + ANIM_POSC_D_X_OFFSET, dX);
        posCAnims.setFloat32(offset + ANIM_POSC_D_Y_OFFSET, dY);
        posCAnims.setFloat32(offset + ANIM_POSC_D_Z_OFFSET, dZ);

        Sprites.setFlag(spriteIdx, SPRITE_POS_CUR_ANIM_FLAG);

        return idx << VERSION_BITS | version;
    }
    ,
    setLoop: function setLoopPosCAnim(idx, loop) {
        const offset = idx * ANIM_POSC_BYTES_PER_ELEMENT;
        const info = posCAnims.getUint16(offset + ANIM_POSC_TIMING_N_INFO_OFFSET);

        posCAnims.setUint16(offset + ANIM_POSC_TIMING_N_INFO_OFFSET, loop ? info | ANIM_POSC_LOOP_FLAG : info & ~ANIM_POSC_LOOP_FLAG);
    }
    ,
    setCallback: function setPosCAnimCallback(idx, callback) {
        const offset = idx * ANIM_POSC_BYTES_PER_ELEMENT;
        const info = posCAnims.getUint16(offset + ANIM_POSC_TIMING_N_INFO_OFFSET);

        posCAnims.setUint16(offset + ANIM_POSC_TIMING_N_INFO_OFFSET, info | ANIM_POSC_CALLBACK_FLAG);
        callbacks[ANIM_POSC_CB_KEY + idx] = callback;
    }
    ,
    restart: function restartPosCAnim(idx) {
        const offset = idx * ANIM_POSC_BYTES_PER_ELEMENT;
        const duration = posCAnims.getUint32(offset + ANIM_POSC_END_OFFSET) - posCAnims.getUint32(offset + ANIM_POSC_START_OFFSET);
        posCAnims.setUint32(offset + ANIM_POSC_START_OFFSET, frame);
        posCAnims.setUint32(offset + ANIM_POSC_END_OFFSET, frame + duration);
    }
    ,
    delay: function delayPosCAnim(idx, duration) {
        const offset = idx * ANIM_POSC_BYTES_PER_ELEMENT;
        const length = posCAnims.getUint32(offset + ANIM_POSC_END_OFFSET) - posCAnims.getUint32(offset + ANIM_POSC_START_OFFSET);
        posCAnims.setUint32(offset + ANIM_POSC_START_OFFSET, frame + duration);
        posCAnims.setUint32(offset + ANIM_POSC_END_OFFSET, frame + duration + length);
    }
    ,
    remove: function deletePosCAnim(idx) {
        animPosCCount--;

        const offset = idx * ANIM_POSC_BYTES_PER_ELEMENT + ANIM_POSC_VERSION_N_STATE_OFFSET;

        let currentVersion = posCAnims.getUint16(offset) >> 1;

        if (currentVersion < MAX_VERSION) {
            currentVersion++; // increase version
            posCAnims.setUint16(offset, currentVersion << 1);

        } else {
            console.log(`position curve animation @${idx} is at max version`);
        }

        if (animPosCMinIdx == idx) {
            for (let i = idx; i <= animPosCMaxIdx; i++) {
                if (posCAnims.getUint16(i * ANIM_POSC_BYTES_PER_ELEMENT + ANIM_POSC_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    animPosCMinIdx = i;
                    break;
                }
            }
            if (animPosCMinIdx == idx)
                animPosCMinIdx = animPosCMaxIdx;
        }

        if (animPosCMaxIdx == idx) {
            for (let i = idx; i >= animPosCMinIdx; i--) {
                if (posCAnims.getUint16(i * ANIM_POSC_BYTES_PER_ELEMENT + ANIM_POSC_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    animPosCMaxIdx = i;
                    break;
                }
            }
            if (animPosCMaxIdx == idx)
                animPosCMaxIdx = animPosCMinIdx;
        }

        const sprite = posCAnims.getUint32(offset + ANIM_POSC_SPRITE_OFFSET);
        Sprites.clearFlag(sprite >> VERSION_BITS, SPRITE_POS_CUR_ANIM_FLAG);
    }
    ,
    removeBy: function deletePosCAnimBySprite(sprite) {
        let idx;
        for (idx = 0; idx < ANIM_POSC_MAX_ELEMENTS; idx++) {

            const offset = idx * ANIM_POSC_BYTES_PER_ELEMENT;
            const flags = posCAnims.getUint16(offset + ANIM_POSC_VERSION_N_STATE_OFFSET);

            if (flags & ACTIVE_FLAG && sprite == posCAnims.getUint32(offset + ANIM_POSC_SPRITE_OFFSET, sprite)) {
                this.remove(idx);
                break;
            }
        }
    }
};


const totalSizeAnimBuffers = ANIM_SCALE_BUFFER_SIZE + ANIM_ROT1D_BUFFER_SIZE + ANIM_COLOR1C_BUFFER_SIZE + ANIM_POS_BUFFER_SIZE + ANIM_POSC_BUFFER_SIZE;
console.log(`animation system buffer size (excl. callback function pointers): ${(totalSizeAnimBuffers / 1024 / 1024).toFixed(2)} mb`);

// TRANSITION TIMING CONSTANTS (aka SPACING aka the transformation fn)
const LINEAR = 0;
const EASE_IN_QUAD = 1;
const EASE_OUT_QUAD = 2;
const EASE_IN_OUT_QUAD = 3;
const EASE_IN_CUBIC = 4;
const EASE_OUT_CUBIC = 5;
const EASE_IN_OUT_CUBIC = 6;
const EASE_IN_QUART = 7;
const EASE_OUT_QUART = 8;
const EASE_IN_OUT_QUART = 9;
const EASE_IN_QUINT = 10;
const EASE_OUT_QUINT = 11;
const EASE_IN_OUT_QUINT = 12;

function map(x, minX, maxX, minY, maxY, trans) {
    const xNormalized = (x - minX) / (maxX - minX);

    const xTransformed = (trans == LINEAR) ? xNormalized : nonLinearTransform(xNormalized, trans);

    const xScaled = xTransformed * (maxY - minY) + minY;
    return xScaled;
}

function nonLinearTransform(x, spacing) {
    if (spacing == EASE_IN_QUAD)
        return x * x;
    else if (spacing == EASE_IN_CUBIC)
        return x * x * x;
    else if (spacing == EASE_IN_QUART)
        return x * x * x * x;
    else if (spacing == EASE_IN_QUINT)
        return x * x * x * x * x;

    else if (spacing == EASE_OUT_QUAD) {
        const xInv = (1 - x);
        return 1 - xInv * xInv;
    }
    else if (spacing == EASE_OUT_CUBIC) {
        const xInv = (1 - x);
        return 1 - xInv * xInv * xInv;
    }
    else if (spacing == EASE_OUT_QUART) {
        const xInv = (1 - x);
        return 1 - xInv * xInv * xInv * xInv;
    }
    else if (spacing == EASE_OUT_QUINT) {
        const xInv = (1 - x);
        return 1 - xInv * xInv * xInv * xInv * xInv;
    }

    else if (spacing == EASE_IN_OUT_QUAD) {
        const x2 = x * x;
        const xInv = (1 - x);
        const xInv2Inv = 1 - xInv * xInv;
        const xMixed = x2 * xInv + xInv2Inv * x;
        return xMixed;
    }
    else if (spacing == EASE_IN_OUT_CUBIC) {
        const x3 = x * x * x;
        const xInv = (1 - x);
        const xInv3Inv = 1 - xInv * xInv * xInv;
        const xMixed = x3 * xInv + xInv3Inv * x;
        return xMixed;
    }
    else if (spacing == EASE_IN_OUT_QUART) {
        const x4 = x * x * x * x;
        const xInv = (1 - x);
        const xInv4Inv = 1 - xInv * xInv * xInv * xInv;
        const xMixed = x4 * xInv + xInv4Inv * x;
        return xMixed;
    }
    else if (spacing == EASE_IN_OUT_QUINT) {
        const x5 = x * x * x * x * x;
        const xInv = (1 - x);
        const xInv5Inv = 1 - xInv * xInv * xInv * xInv * xInv;
        const xMixed = x5 * xInv + xInv5Inv * x;
        return xMixed;
    }
}

let frame = 0;

/*
 * EVENT LOOP
 */
function eventLoop() {
    requestAnimationFrame(eventLoop);

    // animate frame
    {
        if (animScaleCount > 0) {
            let idx;
            for (idx = animScaleMinIdx; idx <= animScaleMaxIdx; idx++) {
                const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;
                const flags = scaleAnims.getUint16(offset + ANIM_SCALE_VERSION_N_STATE_OFFSET);
                if (flags & ACTIVE_FLAG) {

                    const start = scaleAnims.getUint32(offset + ANIM_SCALE_START_OFFSET);
                    if (start > frame)
                        continue;

                    const info = scaleAnims.getUint16(offset + ANIM_SCALE_TIMING_N_INFO_OFFSET);
                    const sprite = scaleAnims.getUint32(offset + ANIM_SCALE_SPRITE_OFFSET);
                    const end = scaleAnims.getUint32(offset + ANIM_SCALE_END_OFFSET);
                    const from = scaleAnims.getFloat32(offset + ANIM_SCALE_FROM_OFFSET);
                    const to = scaleAnims.getFloat32(offset + ANIM_SCALE_TO_OFFSET);

                    const timing = info >> ANIM_SCALE_INFO_BITS;
                    const nextScaleValue = map(frame, start, end, from, to, timing);

                    const spriteIdx = sprite >> VERSION_BITS; //getIndex(sprite);
                    {
                        xforms[spriteIdx * XFORMS_ELEMENTS + XFORMS_SCALE_OFFSET] = nextScaleValue;
                        changeFlags |= XFORMS_CHANGED;
                    }

                    if (end == frame) {
                        if (info & ANIM_SCALE_LOOP_FLAG) {
                            scaleAnims.setUint32(offset + ANIM_SCALE_START_OFFSET, frame);
                            scaleAnims.setUint32(offset + ANIM_SCALE_END_OFFSET, frame + (end - start));

                            if (info & ANIM_SCALE_CALLBACK_FLAG) {
                                callbacks[ANIM_SCALE_CB_KEY + idx]();
                            }
                        } else {
                            ScaleAnimations.remove(idx);

                            if (info & ANIM_SCALE_CALLBACK_FLAG) {
                                callbacks[ANIM_SCALE_CB_KEY + idx]();
                                delete callbacks[ANIM_SCALE_CB_KEY + idx];
                            }
                        }
                    }
                }
            }
        }

        if (animRot1DCount > 0) {
            let idx;
            for (idx = animRot1DMinIdx; idx <= animRot1DMaxIdx; idx++) {
                const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;
                const flags = rot1DAnims.getUint16(offset + ANIM_ROT1D_VERSION_N_STATE_OFFSET);
                if (flags & ACTIVE_FLAG) {

                    const start = rot1DAnims.getUint32(offset + ANIM_ROT1D_START_OFFSET);
                    if (start > frame)
                        continue;

                    const info = rot1DAnims.getUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET);
                    const sprite = rot1DAnims.getUint32(offset + ANIM_ROT1D_SPRITE_OFFSET);
                    const end = rot1DAnims.getUint32(offset + ANIM_ROT1D_END_OFFSET);
                    const from = rot1DAnims.getFloat32(offset + ANIM_ROT1D_FROM_OFFSET);
                    const to = rot1DAnims.getFloat32(offset + ANIM_ROT1D_TO_OFFSET);

                    const timing = info >> ANIM_ROT1D_INFO_BITS;
                    const nextRot1DValue = map(frame, start, end, from, to, timing);

                    const spriteIdx = sprite >> VERSION_BITS; //getIndex(sprite);
                    {
                        if (info & ANIM_ROT1D_X_FLAG)
                            xforms[spriteIdx * XFORMS_ELEMENTS + XFORMS_ROTATION_X_OFFSET] = nextRot1DValue;
                        else if (info & ANIM_ROT1D_Y_FLAG)
                            xforms[spriteIdx * XFORMS_ELEMENTS + XFORMS_ROTATION_Y_OFFSET] = nextRot1DValue;
                        else if (info & ANIM_ROT1D_Z_FLAG)
                            xforms[spriteIdx * XFORMS_ELEMENTS + XFORMS_ROTATION_Z_OFFSET] = nextRot1DValue;
                        changeFlags |= XFORMS_CHANGED;
                    }

                    if (end == frame) {
                        if (info & ANIM_ROT1D_LOOP_FLAG) {
                            rot1DAnims.setUint32(offset + ANIM_ROT1D_START_OFFSET, frame);
                            rot1DAnims.setUint32(offset + ANIM_ROT1D_END_OFFSET, frame + (end - start));

                            if (info & ANIM_ROT1D_CALLBACK_FLAG) {
                                callbacks[ANIM_ROT1D_CB_KEY + idx]();
                            }
                        } else {
                            Rot1DAnimations.remove(idx);

                            if (info & ANIM_ROT1D_CALLBACK_FLAG) {
                                callbacks[ANIM_ROT1D_CB_KEY + idx]();
                                delete callbacks[ANIM_ROT1D_CB_KEY + idx];
                            }
                        }
                    }
                }
            }
        }

        if (animColor1CCount > 0) {
            let idx;
            for (idx = animColor1CMinIdx; idx <= animColor1CMaxIdx; idx++) {
                const offset = idx * ANIM_COLOR1C_BYTES_PER_ELEMENT;
                const flags = color1CAnims.getUint16(offset + ANIM_COLOR1C_VERSION_N_STATE_OFFSET);
                if (flags & ACTIVE_FLAG) {

                    const start = color1CAnims.getUint32(offset + ANIM_COLOR1C_START_OFFSET);
                    if (start > frame)
                        continue;

                    const info = color1CAnims.getUint16(offset + ANIM_COLOR1C_TIMING_N_INFO_OFFSET);
                    const sprite = color1CAnims.getUint32(offset + ANIM_COLOR1C_SPRITE_OFFSET);
                    const end = color1CAnims.getUint32(offset + ANIM_COLOR1C_END_OFFSET);
                    const from = color1CAnims.getFloat32(offset + ANIM_COLOR1C_FROM_OFFSET);
                    const to = color1CAnims.getFloat32(offset + ANIM_COLOR1C_TO_OFFSET);

                    const timing = info >> ANIM_COLOR1C_INFO_BITS;
                    const nextColor1CValue = map(frame, start, end, from, to, timing);

                    const spriteIdx = sprite >> VERSION_BITS; //getIndex(sprite);
                    {
                        colors[spriteIdx * COLOR_ELEMENTS + COLOR_ALPHA_OFFSET] = nextColor1CValue;
                        changeFlags |= COLORS_CHANGED;
                    }

                    if (end == frame) {
                        if (info & ANIM_COLOR1C_LOOP_FLAG) {
                            color1CAnims.setUint32(offset + ANIM_COLOR1C_START_OFFSET, frame);
                            color1CAnims.setUint32(offset + ANIM_COLOR1C_END_OFFSET, frame + (end - start));

                            if (info & ANIM_COLOR1C_CALLBACK_FLAG) {
                                callbacks[ANIM_COLOR1C_CB_KEY + idx]();
                            }
                        } else {
                            Color1CAnimations.remove(idx);

                            if (info & ANIM_COLOR1C_CALLBACK_FLAG) {
                                callbacks[ANIM_COLOR1C_CB_KEY + idx]();
                                delete callbacks[ANIM_COLOR1C_CB_KEY + idx];
                            }
                        }
                    }
                }
            }
        }

        if (animPosCount > 0) {
            let idx;
            for (idx = animPosMinIdx; idx <= animPosMaxIdx; idx++) {
                const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;
                const flags = posAnims.getUint16(offset + ANIM_POS_VERSION_N_STATE_OFFSET);
                if (flags & ACTIVE_FLAG) {

                    const start = posAnims.getUint32(offset + ANIM_POS_START_OFFSET);
                    if (start > frame)
                        continue;

                    const info = posAnims.getUint16(offset + ANIM_POS_TIMING_N_INFO_OFFSET);
                    const sprite = posAnims.getUint32(offset + ANIM_POS_SPRITE_OFFSET);
                    const end = posAnims.getUint32(offset + ANIM_POS_END_OFFSET);

                    const fromX = posAnims.getFloat32(offset + ANIM_POS_FROM_X_OFFSET);
                    const toX = posAnims.getFloat32(offset + ANIM_POS_TO_X_OFFSET);

                    const fromY = posAnims.getFloat32(offset + ANIM_POS_FROM_Y_OFFSET);
                    const toY = posAnims.getFloat32(offset + ANIM_POS_TO_Y_OFFSET);

                    const fromZ = posAnims.getFloat32(offset + ANIM_POS_FROM_Z_OFFSET);
                    const toZ = posAnims.getFloat32(offset + ANIM_POS_TO_Z_OFFSET);

                    const timing = info >> ANIM_POS_INFO_BITS;

                    const tNormalized = (frame - start) / (end - start);

                    const t = (timing == LINEAR) ?
                        tNormalized : nonLinearTransform(tNormalized, timing);

                    const nextPosXValue = fromX + t * (toX - fromX);
                    const nextPosYValue = fromY + t * (toY - fromY);
                    const nextPosZValue = fromZ + t * (toZ - fromZ);

                    const spriteIdx = sprite >> VERSION_BITS; //getIndex(sprite);
                    {
                        positions[spriteIdx * POS_ELEMENTS + POS_X_OFFSET] = nextPosXValue;
                        positions[spriteIdx * POS_ELEMENTS + POS_Y_OFFSET] = nextPosYValue;
                        positions[spriteIdx * POS_ELEMENTS + POS_Z_OFFSET] = nextPosZValue;

                        changeFlags |= POS_CHANGED;
                    }

                    if (end == frame) {
                        if (info & ANIM_POS_LOOP_FLAG) {
                            posAnims.setUint32(offset + ANIM_POS_START_OFFSET, frame);
                            posAnims.setUint32(offset + ANIM_POS_END_OFFSET, frame + (end - start));

                            if (info & ANIM_POS_CALLBACK_FLAG) {
                                callbacks[ANIM_POS_CB_KEY + idx]();
                            }
                        } else {
                            PositionAnimations.remove(idx);

                            if (info & ANIM_POS_CALLBACK_FLAG) {
                                callbacks[ANIM_POS_CB_KEY + idx]();
                                delete callbacks[ANIM_POS_CB_KEY + idx];
                            }
                        }
                    }
                }
            }
        }

        if (animPosCCount > 0) {
            let idx;
            for (idx = animPosCMinIdx; idx <= animPosCMaxIdx; idx++) {
                const offset = idx * ANIM_POSC_BYTES_PER_ELEMENT;
                const flags = posCAnims.getUint16(offset + ANIM_POSC_VERSION_N_STATE_OFFSET);
                if (flags & ACTIVE_FLAG) {

                    const start = posCAnims.getUint32(offset + ANIM_POSC_START_OFFSET);
                    if (start > frame)
                        continue;

                    const info = posCAnims.getUint16(offset + ANIM_POSC_TIMING_N_INFO_OFFSET);
                    const sprite = posCAnims.getUint32(offset + ANIM_POSC_SPRITE_OFFSET);
                    const end = posCAnims.getUint32(offset + ANIM_POSC_END_OFFSET);

                    const aX = posCAnims.getFloat32(offset + ANIM_POSC_A_X_OFFSET);
                    const aY = posCAnims.getFloat32(offset + ANIM_POSC_A_Y_OFFSET);
                    const aZ = posCAnims.getFloat32(offset + ANIM_POSC_A_Z_OFFSET);

                    const bX = posCAnims.getFloat32(offset + ANIM_POSC_B_X_OFFSET);
                    const bY = posCAnims.getFloat32(offset + ANIM_POSC_B_Y_OFFSET);
                    const bZ = posCAnims.getFloat32(offset + ANIM_POSC_B_Z_OFFSET);

                    const cX = posCAnims.getFloat32(offset + ANIM_POSC_C_X_OFFSET);
                    const cY = posCAnims.getFloat32(offset + ANIM_POSC_C_Y_OFFSET);
                    const cZ = posCAnims.getFloat32(offset + ANIM_POSC_C_Z_OFFSET);

                    const dX = posCAnims.getFloat32(offset + ANIM_POSC_D_X_OFFSET);
                    const dY = posCAnims.getFloat32(offset + ANIM_POSC_D_Y_OFFSET);
                    const dZ = posCAnims.getFloat32(offset + ANIM_POSC_D_Z_OFFSET);

                    const timing = info >> ANIM_POSC_INFO_BITS;

                    const tNormalized = (frame - start) / (end - start);

                    const t = (timing == LINEAR) ?
                        tNormalized : nonLinearTransform(tNormalized, timing);

                    const s = 1 - t;
                    const s2 = s * s;
                    const s3 = s2 * s;
                    const t2 = t * t;
                    const t3 = t2 * t;

                    const nextPosXValue = s3 * aX + 3 * s2 * t * bX + 3 * s * t2 * cX + t3 * dX;
                    const nextPosYValue = s3 * aY + 3 * s2 * t * bY + 3 * s * t2 * cY + t3 * dY;
                    const nextPosZValue = s3 * aZ + 3 * s2 * t * bZ + 3 * s * t2 * cZ + t3 * dZ;

                    const spriteIdx = sprite >> VERSION_BITS; //getIndex(sprite);
                    {
                        positions[spriteIdx * POS_ELEMENTS + POS_X_OFFSET] = nextPosXValue;
                        positions[spriteIdx * POS_ELEMENTS + POS_Y_OFFSET] = nextPosYValue;
                        positions[spriteIdx * POS_ELEMENTS + POS_Z_OFFSET] = nextPosZValue;

                        changeFlags |= POS_CHANGED;
                    }

                    if (end == frame) {
                        if (info & ANIM_POSC_LOOP_FLAG) {
                            posCAnims.setUint32(offset + ANIM_POSC_START_OFFSET, frame);
                            posCAnims.setUint32(offset + ANIM_POSC_END_OFFSET, frame + (end - start));

                            if (info & ANIM_POSC_CALLBACK_FLAG) {
                                callbacks[ANIM_POSC_CB_KEY + idx]();
                            }
                        } else {
                            PositionCurveAnimations.remove(idx);

                            if (info & ANIM_POSC_CALLBACK_FLAG) {
                                callbacks[ANIM_POSC_CB_KEY + idx]();
                                delete callbacks[ANIM_POSC_CB_KEY + idx];
                            }
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
    const a_x = -1;
    const a_y = 0;
    const a_z = -5;

    const aceOfSpades = Sprites.create(SubImage.CARD_SA, a_x, a_y);

    const radius = Sprites.getWidthHalf(aceOfSpades >> VERSION_BITS);

    const b_z = a_z + radius * 4 / 3;
    const d_x = a_x + 2 * radius;

    Rot1DAnimations.create(aceOfSpades, ANIM_ROT1D_Y_FLAG, 60, Math.PI, LINEAR);
    PositionCurveAnimations.create(aceOfSpades, 60, a_x, a_y, b_z, d_x, a_y, b_z, d_x, a_y, a_z, LINEAR);

}
