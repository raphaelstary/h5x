export default `

precision highp float;

uniform sampler2D textures[3];
varying vec2 texCoord;
varying vec4 texColor;
varying float texIdx;

void main() {
    vec4 pixel;
    int idx = int(texIdx);
    if (idx == 0) {
        pixel = texture2D(textures[0], texCoord);
    } else if (idx == 1) {
        pixel = texture2D(textures[1], texCoord);
    } else if (idx == 2) {
        pixel = texture2D(textures[2], texCoord);
    }

    if (pixel.a < 1.0)
        discard;
    gl_FragColor = mix(pixel, texColor, texColor.a);
}
`;
