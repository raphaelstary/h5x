import {
    ACTIVE_FLAG,
    VERSION_BITS,
    VERSION_MASK,
    MAX_VERSION,
    INVALID_INDEX
} from '../constants/BaseECS.js';
import Sprites from '../Sprites.js';
import { renderStore as $ } from '../setupWebGL.js';
import {
    SPRITE_ROT1D_X_ANIM_FLAG,
    SPRITE_ROT1D_Y_ANIM_FLAG,
    SPRITE_ROT1D_Z_ANIM_FLAG
} from '../constants/SpriteBuffer.js';
import {
    ANIM_ROT1D_MAX_ELEMENTS,
    ANIM_ROT1D_BYTES_PER_ELEMENT,
    ANIM_ROT1D_BUFFER_SIZE,
    ANIM_ROT1D_VERSION_N_STATE_OFFSET,
    ANIM_ROT1D_TIMING_N_INFO_OFFSET,
    ANIM_ROT1D_SPRITE_OFFSET,
    ANIM_ROT1D_START_OFFSET,
    ANIM_ROT1D_END_OFFSET,
    ANIM_ROT1D_FROM_OFFSET,
    ANIM_ROT1D_TO_OFFSET,
    ANIM_ROT1D_INFO_BITS,
    ANIM_ROT1D_CALLBACK_FLAG,
    ANIM_ROT1D_LOOP_FLAG,
    ANIM_ROT1D_X_FLAG,
    ANIM_ROT1D_Y_FLAG,
    ANIM_ROT1D_Z_FLAG,
    ANIM_ROT1D_CB_KEY
} from '../constants/AnimationBuffer.js';

const Rot1DAnimations = Object.seal({
    data: new DataView(new ArrayBuffer(ANIM_ROT1D_BUFFER_SIZE)),
    callbacks: new Map(),

    count: 0,
    minIdx: 0,
    maxIdx: 0,

    getIndex(id) {
        const idx = id >> VERSION_BITS;
        const version = id & VERSION_MASK;
        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT + ANIM_ROT1D_VERSION_N_STATE_OFFSET;
        const currentVersion = this.data.getUint16(offset) >> 1;

        if (version == currentVersion)
            return idx;
        return INVALID_INDEX;
    }
    ,
    create(sprite, property, duration, toValue, timing) {
        let idx;
        let version;
        for (idx = 0; idx < ANIM_ROT1D_MAX_ELEMENTS; idx++) {

            const flags = this.data.getUint16(idx * ANIM_ROT1D_BYTES_PER_ELEMENT + ANIM_ROT1D_VERSION_N_STATE_OFFSET);

            if (!(flags & ACTIVE_FLAG)) {

                version = flags >> 1;
                this.data.setUint16(idx * ANIM_ROT1D_BYTES_PER_ELEMENT + ANIM_ROT1D_VERSION_N_STATE_OFFSET, flags | ACTIVE_FLAG);

                break;
            }
        }

        if (idx == undefined)
            throw new Error('could not create new rot1d animation, probably no space left');

        this.count++;

        if (this.minIdx > idx)
            this.minIdx = idx;

        if (this.maxIdx < idx)
            this.maxIdx = idx;

        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;

        this.data.setUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET, timing << ANIM_ROT1D_INFO_BITS | property);

        this.data.setUint32(offset + ANIM_ROT1D_SPRITE_OFFSET, sprite);
        this.data.setUint32(offset + ANIM_ROT1D_START_OFFSET, $.frame);
        this.data.setUint32(offset + ANIM_ROT1D_END_OFFSET, $.frame + duration);

        const spriteIdx = sprite >> VERSION_BITS;
        if (property & ANIM_ROT1D_X_FLAG) {
            this.data.setFloat32(offset + ANIM_ROT1D_FROM_OFFSET, Sprites.getRotationX(spriteIdx));
            Sprites.setFlag(spriteIdx, SPRITE_ROT1D_X_ANIM_FLAG);
        } else if (property & ANIM_ROT1D_Y_FLAG) {
            this.data.setFloat32(offset + ANIM_ROT1D_FROM_OFFSET, Sprites.getRotationY(spriteIdx));
            Sprites.setFlag(spriteIdx, SPRITE_ROT1D_Y_ANIM_FLAG);
        } else if (property & ANIM_ROT1D_Z_FLAG) {
            this.data.setFloat32(offset + ANIM_ROT1D_FROM_OFFSET, Sprites.getRotationZ(spriteIdx));
            Sprites.setFlag(spriteIdx, SPRITE_ROT1D_Z_ANIM_FLAG);
        }

        this.data.setFloat32(offset + ANIM_ROT1D_TO_OFFSET, toValue);

        return idx << VERSION_BITS | version;
    }
    ,
    setLoop(idx, loop) {
        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;
        const info = this.data.getUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET);

        this.data.setUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET, loop ? info | ANIM_ROT1D_LOOP_FLAG : info & ~ANIM_ROT1D_LOOP_FLAG);
    }
    ,
    setCallback(idx, callback) {
        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;
        const info = this.data.getUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET);

        this.data.setUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET, info | ANIM_ROT1D_CALLBACK_FLAG);
        this.callbacks.set(ANIM_ROT1D_CB_KEY + idx, callback);
    }
    ,
    restart(idx) {
        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;
        const duration = this.data.getUint32(offset + ANIM_ROT1D_END_OFFSET) - this.data.getUint32(offset + ANIM_ROT1D_START_OFFSET);
        this.data.setUint32(offset + ANIM_ROT1D_START_OFFSET, $.frame);
        this.data.setUint32(offset + ANIM_ROT1D_END_OFFSET, $.frame + duration);
    }
    ,
    delay(idx, duration) {
        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;
        const length = this.data.getUint32(offset + ANIM_ROT1D_END_OFFSET) - this.data.getUint32(offset + ANIM_ROT1D_START_OFFSET);
        this.data.setUint32(offset + ANIM_ROT1D_START_OFFSET, $.frame + duration);
        this.data.setUint32(offset + ANIM_ROT1D_END_OFFSET, $.frame + duration + length);
    }
    ,
    remove(idx) {
        this.count--;

        const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT + ANIM_ROT1D_VERSION_N_STATE_OFFSET;

        let currentVersion = this.data.getUint16(offset) >> 1;

        if (currentVersion < MAX_VERSION) {
            currentVersion++; // increase version
            this.data.setUint16(offset, currentVersion << 1);

        } else {
            console.log(`rot1d animation @${idx} is at max version`);
        }

        if (this.minIdx == idx) {
            for (let i = idx; i <= this.maxIdx; i++) {
                if (this.data.getUint16(i * ANIM_ROT1D_BYTES_PER_ELEMENT + ANIM_ROT1D_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    this.minIdx = i;
                    break;
                }
            }
            if (this.minIdx == idx)
                this.minIdx = this.maxIdx;
        }

        if (this.maxIdx == idx) {
            for (let i = idx; i >= this.minIdx; i--) {
                if (this.data.getUint16(i * ANIM_ROT1D_BYTES_PER_ELEMENT + ANIM_ROT1D_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    this.maxIdx = i;
                    break;
                }
            }
            if (this.maxIdx == idx)
                this.maxIdx = this.minIdx;
        }


        const spriteIdx = this.data.getUint32(offset + ANIM_ROT1D_SPRITE_OFFSET) >> VERSION_BITS;
        const info = this.data.getUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET);
        if (info & ANIM_ROT1D_X_FLAG)
            Sprites.clearFlag(spriteIdx, SPRITE_ROT1D_X_ANIM_FLAG);
        else if (info & ANIM_ROT1D_Y_FLAG)
            Sprites.clearFlag(spriteIdx, SPRITE_ROT1D_Y_ANIM_FLAG);
        else if (info & ANIM_ROT1D_Z_FLAG)
            Sprites.clearFlag(spriteIdx, SPRITE_ROT1D_Z_ANIM_FLAG);
    }
    ,
    removeBy(sprite, deleteCount) {
        let idx;
        let count = 0;
        for (idx = 0; idx < ANIM_ROT1D_MAX_ELEMENTS; idx++) {

            const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;
            const flags = this.data.getUint16(offset + ANIM_ROT1D_VERSION_N_STATE_OFFSET);

            if (flags & ACTIVE_FLAG && sprite == this.data.getUint32(offset + ANIM_ROT1D_SPRITE_OFFSET, sprite)) {
                this.remove(idx);
                if (++count == deleteCount)
                    break;
            }
        }
    }
});

export default Rot1DAnimations;
