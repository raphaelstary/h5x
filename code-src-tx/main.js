if (window.Windows)
    console.log(`I'm running on Windows 😎`);

// let atlas = new Image();
// let atlasInfo;
//
// Promise.all([
//
//     new Promise(resolve => window.onload = resolve),
//
//     fetch('../asset-gen/atlas_1080_0.json')
//         .then(response => response.json())
//         .then(json => atlasInfo = json),
//
//     fetch('../asset-gen/atlas_1080_0.png')
//         .then(response => {
//             if (response.ok)
//                 return response.blob();
//
//             throw new Error('could not load atlas');
//         })
//         .then(blob => {
//             atlas.src = URL.createObjectURL(blob);
//         })
//
// ])
//     .catch(error => console.log(error))
//     .then(() => {
//
//
//     });

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


        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });

const canvas = document.getElementById('screen');
const gl = canvas.getContext('webgl');
gl.enable(gl.DEPTH_TEST);

const vertexShaderSrc = `

attribute vec2 position;
attribute vec2 texCoord;
varying vec2 fragTexCoord;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
    fragTexCoord = texCoord;
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
    -0.5, -0.5,
    -0.5, 0.5,
    0.5, -0.5,
    0.5, 0.5
];
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quad), gl.STATIC_DRAW);
const positionLocation = gl.getAttribLocation(program, 'position');
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLocation);

const textureCoords = [
    0.0, 0.0,
    0.0, 1.0,
    1.0, 0.0,
    1.0, 1.0
];
const texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
const texCoordLocation = gl.getAttribLocation(program, 'texCoord');
gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(texCoordLocation);

const samplerLocation = gl.getUniformLocation(program, 'sampler');
