import {
    COLORS_CHANGED,
    DIM_CHANGED,
    POS_CHANGED,
    SUB_IMG_CHANGED,
    XFORMS_CHANGED,
    COLOR_ALPHA_OFFSET,
    COLOR_BLUE_OFFSET,
    COLOR_ELEMENTS,
    COLOR_GREEN_OFFSET,
    COLOR_RED_OFFSET,
    DIM_ELEMENTS,
    ELEMENTS_CHUNK,
    MAX_ELEMENTS,
    POS_ELEMENTS,
    POS_X_OFFSET,
    POS_Y_OFFSET,
    POS_Z_OFFSET,
    renderStore as $,
    SUB_IMG_ELEMENTS,
    XFORMS_ELEMENTS,
    XFORMS_ROTATION_X_OFFSET,
    XFORMS_ROTATION_Y_OFFSET,
    XFORMS_ROTATION_Z_OFFSET,
    XFORMS_SCALE_OFFSET
} from './setupWebGL.js';

export const ACTIVE_FLAG = 0b1;
export const VERSION_BITS = 15;
export const VERSION_MASK = 0b111111111111111;
export const MAX_VERSION = (1 << VERSION_BITS) - 1;
export const INVALID_INDEX = -1;

export const SPRITE_ELEMENTS = 2;
export const SPRITE_VERSION_N_STATE_OFFSET = 0;
export const SPRITE_ANIMS_OFFSET = 1;

// info flags
export const SPRITE_SCALE_ANIM_FLAG = 0b0000000000000001;
export const SPRITE_ROT1D_X_ANIM_FLAG = 0b0000000000000010;
export const SPRITE_ROT1D_Y_ANIM_FLAG = 0b0000000000000100;
export const SPRITE_ROT1D_Z_ANIM_FLAG = 0b0000000000001000;
export const SPRITE_COLOR1C_ANIM_FLAG = 0b0000000000010000;
export const SPRITE_POS_LIN_ANIM_FLAG = 0b0000000000100000;
export const SPRITE_POS_CUR_ANIM_FLAG = 0b0000000001000000;


const SPRITES_LENGTH = MAX_ELEMENTS * SPRITE_ELEMENTS;
console.log(`sprite store size: ${(SPRITES_LENGTH * 2 / 1024).toFixed(2)} kb`);


/*
 * SPRITE API
 */
const Sprites = {
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
    create(imgId, x, y, z = -5) {
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
        $.dimensions[idx * DIM_ELEMENTS] = spriteDimensions[dimIdx];
        $.dimensions[idx * DIM_ELEMENTS + 1] = spriteDimensions[dimIdx + 1];
        $.dimensions[idx * DIM_ELEMENTS + 2] = spriteDimensions[dimIdx + 2];
        $.dimensions[idx * DIM_ELEMENTS + 3] = spriteDimensions[dimIdx + 3];

        const subImgIdx = imgId * SUB_IMG_ELEMENTS;
        $.subImages[idx * SUB_IMG_ELEMENTS] = baseSubImages[subImgIdx];
        $.subImages[idx * SUB_IMG_ELEMENTS + 1] = baseSubImages[subImgIdx + 1];
        $.subImages[idx * SUB_IMG_ELEMENTS + 2] = baseSubImages[subImgIdx + 2];
        $.subImages[idx * SUB_IMG_ELEMENTS + 3] = baseSubImages[subImgIdx + 3];

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
        $.dimensions[idx * DIM_ELEMENTS] = spriteDimensions[dimIdx];
        $.dimensions[idx * DIM_ELEMENTS + 1] = spriteDimensions[dimIdx + 1];
        $.dimensions[idx * DIM_ELEMENTS + 2] = spriteDimensions[dimIdx + 2];
        $.dimensions[idx * DIM_ELEMENTS + 3] = spriteDimensions[dimIdx + 3];

        const subImgIdx = imgId * SUB_IMG_ELEMENTS;
        $.subImages[idx * SUB_IMG_ELEMENTS] = baseSubImages[subImgIdx];
        $.subImages[idx * SUB_IMG_ELEMENTS + 1] = baseSubImages[subImgIdx + 1];
        $.subImages[idx * SUB_IMG_ELEMENTS + 2] = baseSubImages[subImgIdx + 2];
        $.subImages[idx * SUB_IMG_ELEMENTS + 3] = baseSubImages[subImgIdx + 3];

        $.changeFlags |= DIM_CHANGED | SUB_IMG_CHANGED;
    }
    ,
    getWidthHalf(idx) {
        return $.dimensions[idx * DIM_ELEMENTS];
    }
    ,
    getHeightHalf(idx) {
        return $.dimensions[idx * DIM_ELEMENTS + 1];
    }
};

export default Sprites;
