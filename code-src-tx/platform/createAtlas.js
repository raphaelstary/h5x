/**
 * @param {{name: string, img: Image}[]} avatars
 * @returns {{atlas: HTMLCanvasElement, info: {width: number, height: number, frames: {name, x: number, width: number, y: number, height: number}[]}}}
 */
export default function createAtlas(avatars) {
    const height = Math.max(...avatars.map(({img}) => img.height));
    const width = avatars.reduce((totalWidth, {img}) => totalWidth + img.width, 0);

    /** @type {HTMLCanvasElement} */
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    let offsetX = 0;
    const info = {
        width,
        height,
        frames: avatars.map(({name, img}) => {
            ctx.drawImage(img, offsetX, 0);
            const frame = {
                name,
                x: offsetX,
                y: 0,
                width: img.width,
                height: img.height
            };
            offsetX += img.width;
            return frame;
        })
    };

    return {atlas: canvas, info};
}
