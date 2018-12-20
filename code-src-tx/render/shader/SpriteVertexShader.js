export default `

attribute vec4 position;
attribute vec4 xforms;
attribute vec4 dimensions;
attribute vec4 color;
attribute vec4 subImage;
attribute vec4 quad;

uniform mat4 view;
uniform mat4 projection;

varying vec2 texCoord;
varying vec4 texColor;
varying float texIdx;

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

    vec4 tmpPosition = translate * vec4(position.xyz, 1.0);

    translate[3][0] = -position.x;
    translate[3][1] = -position.y;
    translate[3][2] = -position.z;

    tmpPosition = rotateX * rotateY * rotateZ * translate * tmpPosition;

    translate[3][0] = position.x + dimensions.x * dimensions.z;
    translate[3][1] = position.y + dimensions.y * dimensions.w;
    translate[3][2] = position.z;

    gl_Position = projection * view * translate * scale * tmpPosition;

    texCoord = vec2(subImage.x + subImage.z * quad.z, subImage.y + subImage.w * quad.w);
    texColor = color;
    texIdx = position.w;
}
`;
