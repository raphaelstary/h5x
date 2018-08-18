fetch('../asset-gen/atlas_1080_0.json')
    .then(response => response.json())
    .then(json => console.log(json))
    .catch(error => console.error(error));

let img = new Image();

fetch('../asset-gen/atlas_1080_0.png')
    .then(response => {
        if (response.ok)
            return response.blob();

        throw new Error('could not load atlas');
    })
    .then(blob => {
        img.src = URL.createObjectURL(blob);
    })
    .catch(error => console.log(error));

if (window.Windows)
    console.log(`I'm running on Windows 😎`);

const canvas = document.getElementById('screen');
const gl = canvas.getContext('webgl');

const vertexShaderSrc = `
attribute vec4 position;

uniform mat4 modelView;
uniform mat4 projection;

void main() {
    gl_Position = projection * modelView * position;
}
`;

const fragmentShaderSrc = `
void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
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

let position = gl.getAttribLocation(program, 'position');
// let modelView = gl.getAttribLocation(program, 'modelView');
let modelView = gl.getUniformLocation(program, 'modelView');
// let projection = gl.getAttribLocation(program, 'projection');
let projection = gl.getUniformLocation(program, 'projection');

const positions = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positions);

const positionData = new Float32Array([
    -1.0, 1.0,
    1.0, 1.0,
    -1.0, -1.0,
    1.0, -1.0
]);
gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.STATIC_DRAW);

gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clearDepth(1.0);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);

gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

const fieldOfView = 45 * Math.PI / 180;
const aspect = 1280 / 720;
const zMin = 0.1;
const zMax = 100.0;

const projectionMatrix = mat4.create();
mat4;