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
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = URL.createObjectURL(blob);
            });
        })
])
    .catch(error => console.log(error))
    .then(values => {
        const dimensions = new Uint32Array(values[1]);
        const subImages = new Float32Array(values[2]);
        const img = values[3];

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([1280 / 2, 720 / 2, 1]));

        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([0, 1, 1, 0.4]));

        gl.bindBuffer(gl.ARRAY_BUFFER, transformsBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([1, 5]));

        const dimIdx = SubImage.CARD_C2 * 2;
        gl.bindBuffer(gl.ARRAY_BUFFER, dimensionsBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([dimensions[dimIdx], dimensions[dimIdx + 1]]));

        const subImgIdx = SubImage.CARD_C2 * 4;
        gl.bindBuffer(gl.ARRAY_BUFFER, subImageBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(
            [subImages[subImgIdx], subImages[subImgIdx + 1], subImages[subImgIdx + 2], subImages[subImgIdx + 3]]));

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

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

            gl.clearColor(1.0, 0.0, 1.0, 1.0);
            gl.clearDepth(1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, 4);

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


const width = 1280;
const height = 720;
const zNear = -0.1;
const zFar = -100.0;
const a = 2 / width;
const b = 2 / height;
const c = -2 / (zFar - zNear);
const tz = -(zFar + zNear) / (zFar - zNear);

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


const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * MAX_ELEMENTS, gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, 'position');
gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLocation);
ext.vertexAttribDivisorANGLE(positionLocation, 1);

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * MAX_ELEMENTS, gl.STATIC_DRAW);

const colorLocation = gl.getAttribLocation(program, 'color');
gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(colorLocation);
ext.vertexAttribDivisorANGLE(colorLocation, 1);

const transformsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, transformsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * MAX_ELEMENTS, gl.STATIC_DRAW);

const transformsLocation = gl.getAttribLocation(program, 'xforms');
gl.vertexAttribPointer(transformsLocation, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(transformsLocation);
ext.vertexAttribDivisorANGLE(transformsLocation, 1);

const dimensionsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, dimensionsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * MAX_ELEMENTS, gl.STATIC_DRAW);

const dimensionsLocation = gl.getAttribLocation(program, 'dimensions');
gl.vertexAttribPointer(dimensionsLocation, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(dimensionsLocation);
ext.vertexAttribDivisorANGLE(dimensionsLocation, 1);

const subImageBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, subImageBuffer);
gl.bufferData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * MAX_ELEMENTS, gl.STATIC_DRAW);

const subImageLocation = gl.getAttribLocation(program, 'subImage');
gl.vertexAttribPointer(subImageLocation, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(subImageLocation);
ext.vertexAttribDivisorANGLE(subImageLocation, 1);

const texture = gl.createTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const texLocation = gl.getUniformLocation(program, 'tex');
gl.uniform1i(texLocation, 0);
