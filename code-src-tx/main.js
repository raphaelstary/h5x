import * as SubImage from '../code-gen/SubImage.js';

if (window.Windows)
    console.log(`I'm running on Windows 😎`);

Promise.all([

    new Promise(resolve => window.onload = resolve),

    fetch('../asset-gen/sprite-dimensions_720.h5')
        .then(response => {
            if (response.ok)
                return response.arrayBuffer();

            throw new Error('could not fetch sprite-dimensions');
        }),

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
        const baseDimensions = new Uint32Array(values[1]);
        const baseSubImages = new Float32Array(values[2]);
        const img = values[3];

        const BASE_DIM_BUFFER_SIZE = baseDimensions.byteLength;
        const BASE_SUB_IMG_BUFFER_SIZE = baseSubImages.byteLength;
        const TOTAL_BASE_BUFFER_SIZE = BASE_DIM_BUFFER_SIZE + BASE_SUB_IMG_BUFFER_SIZE;
        console.log(`total loaded buffer size: ${(TOTAL_BASE_BUFFER_SIZE / 1024).toFixed(2)} kb`);
        console.log(`texture atlas bitmap size: ${(img.width * img.height * 4 / 1024 / 1024).toFixed(2)} mb`);

        let positions = new Float32Array(positionData, 0, 10 * POS_ELEMENTS);
        let colors = new Float32Array(colorData, 0, 10 * COLOR_ELEMENTS);
        let xforms = new Float32Array(xformsData, 0, 10 * XFORMS_ELEMENTS);
        let dimensions = new Float32Array(dimensionsData, 0, 10 * DIM_ELEMENTS);
        let subImages = new Float32Array(subImageData, 0, 10 * SUB_IMG_ELEMENTS);

        const TOTAL_SUB_BUFFER_SIZE = positions.byteLength + colors.byteLength + xforms.byteLength + dimensions.byteLength + subImages.byteLength;
        console.log(`initial gpu sub buffer tick update size: ${(TOTAL_SUB_BUFFER_SIZE / 1024).toFixed(2)} kb`);


        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        let id = 0;

        function createEntity(id, imgId, x, y) {
            positions[id * POS_ELEMENTS] = x;
            positions[id * POS_ELEMENTS + 1] = y;
            positions[id * POS_ELEMENTS + 2] = 1.0;

            colors[id * COLOR_ELEMENTS] = 1.0;
            colors[id * COLOR_ELEMENTS + 1] = 1.0;
            colors[id * COLOR_ELEMENTS + 2] = 1.0;
            colors[id * COLOR_ELEMENTS + 3] = 0.0;

            xforms[id * XFORMS_ELEMENTS] = 0.0;
            xforms[id * XFORMS_ELEMENTS + 1] = 1.0;

            const dimIdx = imgId * DIM_ELEMENTS;
            dimensions[id * DIM_ELEMENTS] = baseDimensions[dimIdx];
            dimensions[id * DIM_ELEMENTS + 1] = baseDimensions[dimIdx + 1];

            const subImgIdx = imgId * SUB_IMG_ELEMENTS;
            subImages[id * SUB_IMG_ELEMENTS] = baseSubImages[subImgIdx];
            subImages[id * SUB_IMG_ELEMENTS + 1] = baseSubImages[subImgIdx + 1];
            subImages[id * SUB_IMG_ELEMENTS + 2] = baseSubImages[subImgIdx + 2];
            subImages[id * SUB_IMG_ELEMENTS + 3] = baseSubImages[subImgIdx + 3];
        }

        function setX(id, x) {
            positions[id * POS_ELEMENTS] = x;
        }

        function getX(id) {
            return positions[id * POS_ELEMENTS];
        }

        function setY(id, y) {
            positions[id * POS_ELEMENTS + 1] = y;
        }

        function getY(id) {
            return positions[id * POS_ELEMENTS + 1];
        }

        function setZ(id, z) {
            positions[id * POS_ELEMENTS + 2] = z;
        }

        function getZ(id) {
            return positions[id * POS_ELEMENTS + 2];
        }

        function setColor(id, r, g, b, a) {
            colors[id * COLOR_ELEMENTS] = r;
            colors[id * COLOR_ELEMENTS + 1] = g;
            colors[id * COLOR_ELEMENTS + 2] = b;
            colors[id * COLOR_ELEMENTS + 3] = a;
        }

        function setRotation(id, rotation) {
            xforms[id * XFORMS_ELEMENTS] = rotation;
        }

        function getRotation(id) {
            return xforms[id * XFORMS_ELEMENTS];
        }

        function setScale(id, scale) {
            xforms[id * XFORMS_ELEMENTS + 1] = scale;
        }

        function setSubImage(id, imgId) {
            const dimIdx = imgId * DIM_ELEMENTS;
            dimensions[id * DIM_ELEMENTS] = baseDimensions[dimIdx];
            dimensions[id * DIM_ELEMENTS + 1] = baseDimensions[dimIdx + 1];

            const subImgIdx = imgId * SUB_IMG_ELEMENTS;
            subImages[id * SUB_IMG_ELEMENTS] = baseSubImages[subImgIdx];
            subImages[id * SUB_IMG_ELEMENTS + 1] = baseSubImages[subImgIdx + 1];
            subImages[id * SUB_IMG_ELEMENTS + 2] = baseSubImages[subImgIdx + 2];
            subImages[id * SUB_IMG_ELEMENTS + 3] = baseSubImages[subImgIdx + 3];
        }

        function getWidth(id) {
            return dimensions[id * DIM_ELEMENTS] * 2;
        }

        function getHeight(id) {
            return dimensions[id * DIM_ELEMENTS + 1] * 2;
        }

        createEntity(id, SubImage.CARD_SA, WIDTH / 2, HEIGHT / 2);
        id++;
        createEntity(id, SubImage.CARD_S2, WIDTH / 2 + 50, HEIGHT / 2);
        id++;
        createEntity(id, SubImage.CARD_S3, WIDTH / 2 - 50, HEIGHT / 2);
        id++;
        createEntity(id, SubImage.CARD_SK, WIDTH / 2 + 150, HEIGHT / 2);
        id++;
        createEntity(id, SubImage.CARD_SJ, WIDTH / 2 - 150, HEIGHT / 2);
        id++;
        createEntity(id, SubImage.CARD_SQ, WIDTH / 2 + 200, HEIGHT / 2);
        id++;
        createEntity(id, SubImage.CARD_S4, WIDTH / 2 - 200, HEIGHT / 2);
        id++;

        // simplest fps meter 1/3
        // let previousTime = Date.now();
        // let ms = 0;
        // let msMin = Infinity;
        // let msMax = 0;
        // let fps = 0;
        // let fpsMin = Infinity;
        // let fpsMax = 0;
        // let frames = 0;

        function renderLoop() {
            requestAnimationFrame(renderLoop);

            // simplest fps meter 2/3
            // const startTime = Date.now();

            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);

            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors);

            gl.bindBuffer(gl.ARRAY_BUFFER, xformsBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, xforms);

            gl.bindBuffer(gl.ARRAY_BUFFER, dimensionsBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, dimensions);

            gl.bindBuffer(gl.ARRAY_BUFFER, subImageBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, subImages);

            gl.clearColor(1.0, 0.0, 1.0, 1.0);
            gl.clearDepth(1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, id);

            // simplest fps meter 3/3
            // {
            //     const time = Date.now();
            //
            //     ms = time - startTime;
            //     msMin = Math.min(msMin, ms);
            //     msMax = Math.max(msMax, ms);
            //
            //     frames++;
            //
            //     if (time > previousTime + 1000) {
            //
            //         fps = Math.round(frames * 1000 / (time - previousTime));
            //         fpsMin = Math.min(fpsMin, fps);
            //         fpsMax = Math.max(fpsMax, fps);
            //
            //         previousTime = time;
            //         frames = 0;
            //
            //         console.log(Date.now());
            //         console.log('fps: ' + fps);
            //         console.log('min fps: ' + fpsMin);
            //         console.log('max fps: ' + fpsMax);
            //         console.log('ms: ' + ms);
            //         console.log('min ms: ' + msMin);
            //         console.log('max ms: ' + msMax);
            //     }
            // }
        }

        renderLoop();
    });

const canvas = document.getElementById('screen');
const gl = canvas.getContext('webgl', {alpha: false});
const ext = gl.getExtension('ANGLE_instanced_arrays');

console.log('max texture size: ' + gl.getParameter(gl.MAX_TEXTURE_SIZE));
console.log('max vertex attribs: ' + gl.getParameter(gl.MAX_VERTEX_ATTRIBS));

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

const MAX_ELEMENTS = 100;

const vertexShaderSrc = `

attribute vec3 position;
attribute vec2 xforms;
attribute vec2 dimensions;
attribute vec4 color;
attribute vec4 subImage;
attribute vec4 quad;

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

    float c = cos(xforms.x);
    float s = sin(xforms.x);
    mat4 rotate = mat4(
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1.0, 0,
        0, 0, 0, 1.0
    );

    float sx = xforms.y;
    float sy = xforms.y;
    mat4 scale = mat4(
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, 1.0, 0,
        0, 0, 0, 1.0
    );

    vec4 tmpPosition = translate * vec4(position, 1.0);

    translate[3][0] = -position.x;
    translate[3][1] = -position.y;

    tmpPosition = rotate * translate * tmpPosition;

    translate[3][0] = position.x;
    translate[3][1] = position.y;

    gl_Position = projection * translate * scale * tmpPosition;

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


const WIDTH = 1280;
const HEIGHT = 720;
const Z_NEAR = -0.1;
const Z_FAR = -100.0;
const a = 2 / WIDTH;
const b = 2 / HEIGHT;
const c = -2 / (Z_FAR - Z_NEAR);
const tz = -(Z_FAR + Z_NEAR) / (Z_FAR - Z_NEAR);

const projectionLocation = gl.getUniformLocation(program, 'projection');
gl.uniformMatrix4fv(projectionLocation, false, new Float32Array([
    a, 0, 0, 0,
    0, b, 0, 0,
    0, 0, c, 0,
    -1, -1, tz, 1
]));


const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1.0, -1.0, 0.0, 1.0,
    -1.0, 1.0, 0.0, 0.0,
    1.0, -1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 0.0
]), gl.STATIC_DRAW);

const quadLocation = gl.getAttribLocation(program, 'quad');
gl.vertexAttribPointer(quadLocation, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(quadLocation);
ext.vertexAttribDivisorANGLE(quadLocation, 0);


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

const XFORMS_ELEMENTS = 2;
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
console.log(`total alloc buffer size: ${(TOTAL_BUFFER_SIZE / 1024).toFixed(2)} kb`);

const texture = gl.createTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const texLocation = gl.getUniformLocation(program, 'tex');
gl.uniform1i(texLocation, 0);
