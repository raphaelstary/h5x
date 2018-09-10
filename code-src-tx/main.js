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

const canvas = document.getElementById('screen');
const gl = canvas.getContext('webgl');

const vertexShaderSrc = `

attribute vec2 position;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSrc = `
void main() {
    gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
}
`;

const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSrc);
gl.compileShader(vertexShader);

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSrc);
gl.compileShader(fragmentShader);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

gl.useProgram(program);

gl.clearColor(1.0, 0.0, 1.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0.5, 0.5, -0.5, -0.5, -0.5]), gl.STATIC_DRAW);

let positionLocation = gl.getAttribLocation(program, 'position');
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLocation);

gl.drawArrays(gl.TRIANGLES, 0, 3);
