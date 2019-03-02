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

    if (pixel.a < 0.005)
        discard;

    vec4 blendedPixel = mix(pixel, texColor, texColor.a);
    blendedPixel.a = pixel.a;
    gl_FragColor = blendedPixel;
}
`;
