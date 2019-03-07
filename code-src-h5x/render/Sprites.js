import {
    COLORS_CHANGED,
    DIM_CHANGED,
    POS_CHANGED,
    SUB_IMG_CHANGED,
    XFORMS_CHANGED
} from './constants/ChangeFlag.js';
import {
    COLOR_ALPHA_OFFSET,
    COLOR_BLUE_OFFSET,
    COLOR_ELEMENTS,
    COLOR_GREEN_OFFSET,
    COLOR_RED_OFFSET
} from './constants/ColorBuffer.js';
import {
    POS_ELEMENTS,
    POS_X_OFFSET,
    POS_Y_OFFSET,
    POS_Z_OFFSET
} from './constants/PosBuffer.js';
import {
    XFORMS_ELEMENTS,
    XFORMS_ROTATION_X_OFFSET,
    XFORMS_ROTATION_Y_OFFSET,
    XFORMS_ROTATION_Z_OFFSET,
    XFORMS_SCALE_OFFSET
} from './constants/XFormsBuffer.js';
import { DIM_ELEMENTS } from './constants/DimBuffer.js';
import { SUB_IMG_ELEMENTS } from './constants/SubImgBuffer.js';
import { ELEMENTS_CHUNK } from './constants/BaseBuffer.js';
import {
    renderStore as $,
    assetStore as a$
} from './setupWebGL.js';
import ScaleAnimations from './animations/ScaleAnimations.js';
import {
    VERSION_BITS,
    VERSION_MASK,
    MAX_VERSION,
    ACTIVE_FLAG,
    INVALID_INDEX
} from './constants/BaseECS.js';
/* global FontSubImage */
import {
    SPRITES_LENGTH,
    SPRITE_ELEMENTS,
    SPRITE_VERSION_N_STATE_OFFSET,
    SPRITE_ANIMS_OFFSET,
    SPRITE_SCALE_ANIM_FLAG
} from './constants/SpriteBuffer.js';

/*
 * SPRITE API
 */
const Sprites = Object.seal({
    sprites: new Uint16Array(SPRITES_LENGTH),

    count: 0,
    minIdx: 0,
    maxIdx: 0,

    getIndex(id) {
        const idx = id >> VERSION_BITS;
        const version = id & VERSION_MASK;
        const currentVersion = this.sprites[idx * SPRITE_ELEMENTS + SPRITE_VERSION_N_STATE_OFFSET] >> 1;

        if (version == currentVersion)
            return idx;
        return INVALID_INDEX;
    }
    ,
    /**
     * Creates a new sprite
     * @param {number} imgId - idx for atlas subimage
     * @param {number} x - x-coordinate
     * @param {number} y - y-coordinate
     * @param {number} [z=-4.5] - z-coordinate
     * @returns {number} sprite ID
     */
    create(imgId, x, y, z = -4.5) {
        let idx;
        let version;

        for (idx = 0; idx < this.sprites.length; idx++) {

            const offset = idx * SPRITE_ELEMENTS;
            const flags = this.sprites[offset];

            if (!(flags & ACTIVE_FLAG)) {

                version = flags >> 1;
                this.sprites[offset] = flags | ACTIVE_FLAG;
                this.sprites[offset + SPRITE_ANIMS_OFFSET] = 0;

                break;
            }
        }

        if (idx == undefined || version == undefined)
            throw new Error('could not create new sprite, probably no space left');


        this.count++;
        $.changeFlags = POS_CHANGED | COLORS_CHANGED | XFORMS_CHANGED | DIM_CHANGED | SUB_IMG_CHANGED;

        if (this.minIdx > idx)
            this.minIdx = idx;

        if (this.maxIdx < idx) {
            this.maxIdx = idx;

            if (this.maxIdx + 1 > $.maxElements) {
                $.maxElements += ELEMENTS_CHUNK;
                $.resizeTypedViews();
            }
        }

        $.positions[idx * POS_ELEMENTS] = x;
        $.positions[idx * POS_ELEMENTS + 1] = y;
        $.positions[idx * POS_ELEMENTS + 2] = z;

        $.colors[idx * COLOR_ELEMENTS] = 1.0;
        $.colors[idx * COLOR_ELEMENTS + 1] = 1.0;
        $.colors[idx * COLOR_ELEMENTS + 2] = 1.0;
        $.colors[idx * COLOR_ELEMENTS + 3] = 0.0;

        $.xforms[idx * XFORMS_ELEMENTS] = 0.0;
        $.xforms[idx * XFORMS_ELEMENTS + 1] = 0.0;
        $.xforms[idx * XFORMS_ELEMENTS + 2] = 0.0;
        $.xforms[idx * XFORMS_ELEMENTS + 3] = 1.0;

        const dimIdx = imgId * DIM_ELEMENTS;
        $.dimensions[idx * DIM_ELEMENTS] = a$.spriteDimensions[dimIdx];
        $.dimensions[idx * DIM_ELEMENTS + 1] = a$.spriteDimensions[dimIdx + 1];
        $.dimensions[idx * DIM_ELEMENTS + 2] = a$.spriteDimensions[dimIdx + 2];
        $.dimensions[idx * DIM_ELEMENTS + 3] = a$.spriteDimensions[dimIdx + 3];

        const subImgIdx = imgId * (SUB_IMG_ELEMENTS + 1);
        $.subImages[idx * SUB_IMG_ELEMENTS] = a$.baseSubImages[subImgIdx];
        $.subImages[idx * SUB_IMG_ELEMENTS + 1] = a$.baseSubImages[subImgIdx + 1];
        $.subImages[idx * SUB_IMG_ELEMENTS + 2] = a$.baseSubImages[subImgIdx + 2];
        $.subImages[idx * SUB_IMG_ELEMENTS + 3] = a$.baseSubImages[subImgIdx + 3];

        $.positions[idx * POS_ELEMENTS + 3] = a$.baseSubImages[subImgIdx + 4];

        return idx << VERSION_BITS | version;
    }
    ,
    setFlag(idx, flag) {
        this.sprites[idx * SPRITE_ELEMENTS + SPRITE_ANIMS_OFFSET] |= flag;
    }
    ,
    clearFlag(idx, flag) {
        this.sprites[idx * SPRITE_ELEMENTS + SPRITE_ANIMS_OFFSET] &= ~flag;
    }
    ,
    remove(idx) {
        this.count--;

        let currentVersion = this.sprites[idx * SPRITE_ELEMENTS] >> 1;

        if (currentVersion < MAX_VERSION) {
            currentVersion++; // increase version
            this.sprites[idx * SPRITE_ELEMENTS] = currentVersion << 1; // clear active flag -> set inactive

            const animFlags = this.sprites[idx * SPRITE_ELEMENTS + SPRITE_ANIMS_OFFSET];
            if (animFlags & SPRITE_SCALE_ANIM_FLAG) {
                ScaleAnimations.remove();
            }


        } else {
            console.log(`sprite @${idx} is at max version`);
        }

        this.setZ(idx, 1.0);

        if (this.minIdx == idx) {
            for (let i = idx; i < this.sprites.length; i++) {
                if (this.sprites[i * SPRITE_ELEMENTS] & ACTIVE_FLAG) {
                    this.minIdx = i;
                    break;
                }
            }
        }

        if (this.maxIdx == idx) {
            for (let i = idx; i >= 0; i--) {
                if (this.sprites[i * SPRITE_ELEMENTS] & ACTIVE_FLAG) {
                    this.maxIdx = i;
                    break;
                }
            }

            if (this.maxIdx + 1 < $.maxElements - 2 * ELEMENTS_CHUNK) {
                $.maxElements -= ELEMENTS_CHUNK;
                $.resizeTypedViews();
            }
        }
    }
    ,
    setX(idx, x) {
        $.positions[idx * POS_ELEMENTS + POS_X_OFFSET] = x;

        $.changeFlags |= POS_CHANGED;
    }
    ,
    getX(idx) {
        return $.positions[idx * POS_ELEMENTS + POS_X_OFFSET];
    }
    ,
    setY(idx, y) {
        $.positions[idx * POS_ELEMENTS + POS_Y_OFFSET] = y;

        $.changeFlags |= POS_CHANGED;
    }
    ,
    getY(idx) {
        return $.positions[idx * POS_ELEMENTS + POS_Y_OFFSET];
    }
    ,
    setZ(idx, z) {
        $.positions[idx * POS_ELEMENTS + POS_Z_OFFSET] = z;

        $.changeFlags |= POS_CHANGED;
    }
    ,
    getZ(idx) {
        return $.positions[idx * POS_ELEMENTS + POS_Z_OFFSET];
    }
    ,
    setColor(idx, r, g, b, a) {
        $.colors[idx * COLOR_ELEMENTS + COLOR_RED_OFFSET] = r;
        $.colors[idx * COLOR_ELEMENTS + COLOR_GREEN_OFFSET] = g;
        $.colors[idx * COLOR_ELEMENTS + COLOR_BLUE_OFFSET] = b;
        $.colors[idx * COLOR_ELEMENTS + COLOR_ALPHA_OFFSET] = a;

        $.changeFlags |= COLORS_CHANGED;
    }
    ,
    setRed(idx, r) {
        $.colors[idx * COLOR_ELEMENTS + COLOR_RED_OFFSET] = r;

        $.changeFlags |= COLORS_CHANGED;
    }
    ,
    getRed(idx) {
        return $.colors[idx * COLOR_ELEMENTS + COLOR_RED_OFFSET];
    }
    ,
    setGreen(idx, g) {
        $.colors[idx * COLOR_ELEMENTS + COLOR_GREEN_OFFSET] = g;

        $.changeFlags |= COLORS_CHANGED;
    }
    ,
    getGreen(idx) {
        return $.colors[idx * COLOR_ELEMENTS + COLOR_GREEN_OFFSET];
    }
    ,
    setBlue(idx, b) {
        $.colors[idx * COLOR_ELEMENTS + COLOR_BLUE_OFFSET] = b;

        $.changeFlags |= COLORS_CHANGED;
    }
    ,
    getBlue(idx) {
        return $.colors[idx * COLOR_ELEMENTS + COLOR_BLUE_OFFSET];
    }
    ,
    setAlpha(idx, a) {
        $.colors[idx * COLOR_ELEMENTS + COLOR_ALPHA_OFFSET] = a;

        $.changeFlags |= COLORS_CHANGED;
    }
    ,
    getAlpha(idx) {
        return $.colors[idx * COLOR_ELEMENTS + COLOR_ALPHA_OFFSET];
    }
    ,
    setRotationX(idx, rotation) {
        $.xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_X_OFFSET] = rotation;

        $.changeFlags |= COLORS_CHANGED;
    }
    ,
    getRotationX(idx) {
        return $.xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_X_OFFSET];
    }
    ,
    setRotationY(idx, rotation) {
        $.xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_Y_OFFSET] = rotation;

        $.changeFlags |= XFORMS_CHANGED;
    }
    ,
    getRotationY(idx) {
        return $.xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_Y_OFFSET];
    }
    ,
    setRotationZ(idx, rotation) {
        $.xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_Z_OFFSET] = rotation;

        $.changeFlags |= XFORMS_CHANGED;
    }
    ,
    getRotationZ(idx) {
        return $.xforms[idx * XFORMS_ELEMENTS + XFORMS_ROTATION_Z_OFFSET];
    }
    ,
    setScale(idx, scale) {
        $.xforms[idx * XFORMS_ELEMENTS + XFORMS_SCALE_OFFSET] = scale;

        $.changeFlags |= XFORMS_CHANGED;
    }
    ,
    getScale(idx) {
        return $.xforms[idx * XFORMS_ELEMENTS + XFORMS_SCALE_OFFSET];
    }
    ,
    setSubImage(idx, imgId) {
        const dimIdx = imgId * DIM_ELEMENTS;
        $.dimensions[idx * DIM_ELEMENTS] = a$.spriteDimensions[dimIdx];
        $.dimensions[idx * DIM_ELEMENTS + 1] = a$.spriteDimensions[dimIdx + 1];
        $.dimensions[idx * DIM_ELEMENTS + 2] = a$.spriteDimensions[dimIdx + 2];
        $.dimensions[idx * DIM_ELEMENTS + 3] = a$.spriteDimensions[dimIdx + 3];

        const subImgIdx = imgId * (SUB_IMG_ELEMENTS + 1);
        $.subImages[idx * SUB_IMG_ELEMENTS] = a$.baseSubImages[subImgIdx];
        $.subImages[idx * SUB_IMG_ELEMENTS + 1] = a$.baseSubImages[subImgIdx + 1];
        $.subImages[idx * SUB_IMG_ELEMENTS + 2] = a$.baseSubImages[subImgIdx + 2];
        $.subImages[idx * SUB_IMG_ELEMENTS + 3] = a$.baseSubImages[subImgIdx + 3];

        $.positions[idx * POS_ELEMENTS + 3] = a$.baseSubImages[subImgIdx + 4];

        $.changeFlags |= DIM_CHANGED | SUB_IMG_CHANGED | POS_CHANGED;
    }
    ,
    getWidthHalf(idx) {
        return $.dimensions[idx * DIM_ELEMENTS];
    }
    ,
    getHeightHalf(idx) {
        return $.dimensions[idx * DIM_ELEMENTS + 1];
    }
    ,
    createDebugText(text, x, y, z) {
        const letters = [];
        let offsetX = x;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            const codePoint = char.codePointAt(0);
            if (codePoint == 32 || codePoint == 160) {
                offsetX += 0.025;
                continue;
            } else if (codePoint < 33 && codePoint > 126) {
                continue;
            }

            const intValue = parseInt(char);
            const idx = Number.isNaN(intValue) ? FontSubImage.get(char) : FontSubImage.get(intValue);

            const dimIdx = idx * DIM_ELEMENTS;
            const widthHalf = a$.spriteDimensions[dimIdx];
            offsetX += widthHalf;

            const letter = this.create(idx, offsetX, y, z);
            letters.push(letter);

            offsetX += widthHalf;
            offsetX += 0.015;
        }

        return letters;
    }
});

export default Sprites;
