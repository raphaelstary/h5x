if (window.Windows)
    console.log(`I'm running on Windows 😎`);

fetch('../asset/ace-of-spades.png')
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
    .then(img => {

        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(samplerLocation, 0);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
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

    fragTexCoord = quad.zw;
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
    -1.0, -1.0, 0.0, 0.0,
    -1.0, 1.0, 0.0, 1.0,
    1.0, -1.0, 1.0, 0.0,
    1.0, 1.0, 1.0, 1.0
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
const spriteInfo = [
    175.0, 225.0, 1.0, 0.2,
    175.0, 225.0, 0.0, 1.0,
    175.0, 225.0, -Math.PI * 0.25, 1.5,
    175.0, 225.0, 0.0, 0.8
];
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spritePositions), gl.STATIC_DRAW);
const positionLocation = gl.getAttribLocation(program, 'position');
gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLocation);
ext.vertexAttribDivisorANGLE(positionLocation, 1);

const infoBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, infoBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spriteInfo), gl.STATIC_DRAW);
const infoLocation = gl.getAttribLocation(program, 'spriteInfo');
gl.vertexAttribPointer(infoLocation, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(infoLocation);
ext.vertexAttribDivisorANGLE(infoLocation, 1);

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
