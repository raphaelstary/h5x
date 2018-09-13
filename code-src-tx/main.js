if (window.Windows)
    console.log(`I'm running on Windows 😎`);

Promise.all([

    new Promise(resolve => window.onload = resolve),

    fetch('../asset-gen/atlas_4320_0.json')
        .then(response => {
            if (response.ok)
                return response.json();

            throw  new Error('could not fetch json');
        }),

    fetch('../asset-gen/atlas_4320_0.png')
        .then(response => {
            if (response.ok)
                return response.blob();

            throw  new Error('could not fetch image');
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
        const json = values[1];
        const img = values[2];

        const aceOfSpades = json.frames['card-SA'].frame;
        const aceOfHearts = json.frames['card-HA'].frame;
        const aceOfClubs = json.frames['card-CA'].frame;
        const aceOfDiamonds = json.frames['card-DA'].frame;

        const w = json.meta.size.w;
        const h = json.meta.size.h;

        const subImages = [
            aceOfSpades.x / w, aceOfSpades.y / h, aceOfSpades.w / w, aceOfSpades.h / h,
            aceOfHearts.x / w, aceOfHearts.y / h, aceOfHearts.w / w, aceOfHearts.h / h,
            aceOfClubs.x / w, aceOfClubs.y / h, aceOfClubs.w / w, aceOfClubs.h / h,
            aceOfDiamonds.x / w, aceOfDiamonds.y / h, aceOfDiamonds.w / w, aceOfDiamonds.h / h
        ];
        const subImageBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, subImageBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(subImages), gl.STATIC_DRAW);
        const subImageLocation = gl.getAttribLocation(program, 'subImage');
        gl.vertexAttribPointer(subImageLocation, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(subImageLocation);
        ext.vertexAttribDivisorANGLE(subImageLocation, 1);

        const spriteInfo = [
            aceOfSpades.w / 2, aceOfSpades.h / 2, 0.0, 1.0,
            aceOfHearts.w / 2, aceOfHearts.h / 2, 1.0, 1.0,
            aceOfClubs.w / 2, aceOfClubs.h / 2, -Math.PI * 0.25, 1.0,
            aceOfDiamonds.w / 2, aceOfDiamonds.h / 2, 0.0, 1.0
        ];
        const infoBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, infoBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spriteInfo), gl.STATIC_DRAW);
        const infoLocation = gl.getAttribLocation(program, 'spriteInfo');
        gl.vertexAttribPointer(infoLocation, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(infoLocation);
        ext.vertexAttribDivisorANGLE(infoLocation, 1);

        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(samplerLocation, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, 4);
    });

const canvas = document.getElementById('screen');
const gl = canvas.getContext('webgl');
const ext = gl.getExtension('ANGLE_instanced_arrays');

console.log('max texture size: ' + gl.getParameter(gl.MAX_TEXTURE_SIZE));
console.log('max vertex attribs: ' + gl.getParameter(gl.MAX_VERTEX_ATTRIBS));

gl.enable(gl.DEPTH_TEST);

const vertexShaderSrc = `

attribute vec3 position;
attribute vec4 spriteInfo;
attribute vec4 subImage;
attribute vec4 quad;

uniform mat4 projection;

varying vec2 fragTexCoord;

void main() {
    float tx = spriteInfo.x * quad.x;
    float ty = spriteInfo.y * quad.y;
    mat4 translate = mat4(
        1.0, 0, 0, 0,
        0, 1.0, 0, 0,
        0, 0, 1.0, 0,
        tx, ty, 0, 1.0
    );

    float c = cos(spriteInfo.z);
    float s = sin(spriteInfo.z);
    mat4 rotate = mat4(
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1.0, 0,
        0, 0, 0, 1.0
    );

    float sx = spriteInfo.w;
    float sy = spriteInfo.w;
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

    fragTexCoord = vec2(subImage.x + subImage.z * quad.z, subImage.y + subImage.w * quad.w);
}
`;

const fragmentShaderSrc = `

precision highp float;

uniform sampler2D sampler;
varying vec2 fragTexCoord;

void main() {
    gl_FragColor = texture2D(sampler, fragTexCoord);
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

gl.clearColor(1.0, 0.0, 1.0, 1.0);
gl.clearDepth(1.0);

gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

const quad = [
    -1.0, -1.0, 0.0, 1.0,
    -1.0, 1.0, 0.0, 0.0,
    1.0, -1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 0.0
];
const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quad), gl.STATIC_DRAW);
const quadLocation = gl.getAttribLocation(program, 'quad');
gl.vertexAttribPointer(quadLocation, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(quadLocation);
ext.vertexAttribDivisorANGLE(quadLocation, 0);

const samplerLocation = gl.getUniformLocation(program, 'sampler');

const spritePositions = [
    640.0, 360.0, 1.0,
    640.0, 360.0, 3.0,
    640.0, 360.0, 99.0,
    640.0, 360.0, 2.0
];

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spritePositions), gl.STATIC_DRAW);
const positionLocation = gl.getAttribLocation(program, 'position');
gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLocation);
ext.vertexAttribDivisorANGLE(positionLocation, 1);

const width = 1280;
const height = 720;
const zNear = -0.1;
const zFar = -100.0;

const a = 2 / width;
const b = 2 / height;
const c = -2 / (zFar - zNear);

const tz = -(zFar + zNear) / (zFar - zNear);

const projectionMatrix = [
    a, 0, 0, 0,
    0, b, 0, 0,
    0, 0, c, 0,
    -1, -1, tz, 1
];
const projectionLocation = gl.getUniformLocation(program, 'projection');
gl.uniformMatrix4fv(projectionLocation, false, new Float32Array(projectionMatrix));
