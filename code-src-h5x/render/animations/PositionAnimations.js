import {
    ACTIVE_FLAG,
    VERSION_BITS,
    VERSION_MASK,
    MAX_VERSION,
    INVALID_INDEX
} from '../constants/BaseECS.js';
import Sprites from '../Sprites.js';
import { renderStore as $ } from '../setupWebGL.js';
import { SPRITE_POS_LIN_ANIM_FLAG } from '../constants/SpriteBuffer.js';
import {
    ANIM_POS_MAX_ELEMENTS,
    ANIM_POS_BYTES_PER_ELEMENT,
    ANIM_POS_BUFFER_SIZE,
    ANIM_POS_VERSION_N_STATE_OFFSET,
    ANIM_POS_TIMING_N_INFO_OFFSET,
    ANIM_POS_SPRITE_OFFSET,
    ANIM_POS_START_OFFSET,
    ANIM_POS_END_OFFSET,
    ANIM_POS_FROM_X_OFFSET,
    ANIM_POS_TO_X_OFFSET,
    ANIM_POS_FROM_Y_OFFSET,
    ANIM_POS_TO_Y_OFFSET,
    ANIM_POS_FROM_Z_OFFSET,
    ANIM_POS_TO_Z_OFFSET,
    ANIM_POS_INFO_BITS,
    ANIM_POS_CALLBACK_FLAG,
    ANIM_POS_LOOP_FLAG,
    ANIM_POS_CB_KEY
} from '../constants/AnimationBuffer.js';

const PositionAnimations = Object.seal({
    data: new DataView(new ArrayBuffer(ANIM_POS_BUFFER_SIZE)),
    callbacks: new Map(),

    count: 0,
    minIdx: 0,
    maxIdx: 0,

    getIndex(id) {
        const idx = id >> VERSION_BITS;
        const version = id & VERSION_MASK;
        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT + ANIM_POS_VERSION_N_STATE_OFFSET;
        const currentVersion = this.data.getUint16(offset) >> 1;

        if (version == currentVersion)
            return idx;
        return INVALID_INDEX;
    }
    ,
    create(sprite, duration, toX, toY, toZ, timing) {
        let idx;
        let version;
        for (idx = 0; idx < ANIM_POS_MAX_ELEMENTS; idx++) {

            const flags = this.data.getUint16(idx * ANIM_POS_BYTES_PER_ELEMENT + ANIM_POS_VERSION_N_STATE_OFFSET);

            if (!(flags & ACTIVE_FLAG)) {

                version = flags >> 1;
                this.data.setUint16(idx * ANIM_POS_BYTES_PER_ELEMENT + ANIM_POS_VERSION_N_STATE_OFFSET, flags | ACTIVE_FLAG);

                break;
            }
        }

        if (idx == undefined)
            throw new Error('could not create new position animation, probably no space left');

        this.count++;

        if (this.minIdx > idx)
            this.minIdx = idx;

        if (this.maxIdx < idx)
            this.maxIdx = idx;

        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;

        this.data.setUint16(offset + ANIM_POS_TIMING_N_INFO_OFFSET, timing << ANIM_POS_INFO_BITS);

        this.data.setUint32(offset + ANIM_POS_SPRITE_OFFSET, sprite);
        this.data.setUint32(offset + ANIM_POS_START_OFFSET, $.frame);
        this.data.setUint32(offset + ANIM_POS_END_OFFSET, $.frame + duration);

        const spriteIdx = sprite >> VERSION_BITS;
        this.data.setFloat32(offset + ANIM_POS_FROM_X_OFFSET, Sprites.getX(spriteIdx));
        this.data.setFloat32(offset + ANIM_POS_TO_X_OFFSET, toX);

        this.data.setFloat32(offset + ANIM_POS_FROM_Y_OFFSET, Sprites.getY(spriteIdx));
        this.data.setFloat32(offset + ANIM_POS_TO_Y_OFFSET, toY);

        this.data.setFloat32(offset + ANIM_POS_FROM_Z_OFFSET, Sprites.getZ(spriteIdx));
        this.data.setFloat32(offset + ANIM_POS_TO_Z_OFFSET, toZ);

        Sprites.setFlag(spriteIdx, SPRITE_POS_LIN_ANIM_FLAG);

        return idx << VERSION_BITS | version;
    }
    ,
    setLoop(idx, loop) {
        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;
        const info = this.data.getUint16(offset + ANIM_POS_TIMING_N_INFO_OFFSET);

        this.data.setUint16(offset + ANIM_POS_TIMING_N_INFO_OFFSET, loop ? info | ANIM_POS_LOOP_FLAG : info & ~ANIM_POS_LOOP_FLAG);
    }
    ,
    setCallback(idx, callback) {
        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;
        const info = this.data.getUint16(offset + ANIM_POS_TIMING_N_INFO_OFFSET);

        this.data.setUint16(offset + ANIM_POS_TIMING_N_INFO_OFFSET, info | ANIM_POS_CALLBACK_FLAG);
        this.callbacks.set(ANIM_POS_CB_KEY + idx, callback);
    }
    ,
    restart(idx) {
        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;
        const duration = this.data.getUint32(offset + ANIM_POS_END_OFFSET) - this.data.getUint32(offset + ANIM_POS_START_OFFSET);
        this.data.setUint32(offset + ANIM_POS_START_OFFSET, $.frame);
        this.data.setUint32(offset + ANIM_POS_END_OFFSET, $.frame + duration);
    }
    ,
    delay(idx, duration) {
        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;
        const length = this.data.getUint32(offset + ANIM_POS_END_OFFSET) - this.data.getUint32(offset + ANIM_POS_START_OFFSET);
        this.data.setUint32(offset + ANIM_POS_START_OFFSET, $.frame + duration);
        this.data.setUint32(offset + ANIM_POS_END_OFFSET, $.frame + duration + length);
    }
    ,
    remove(idx) {
        this.count--;

        const offset = idx * ANIM_POS_BYTES_PER_ELEMENT + ANIM_POS_VERSION_N_STATE_OFFSET;

        let currentVersion = this.data.getUint16(offset) >> 1;

        if (currentVersion < MAX_VERSION) {
            currentVersion++; // increase version
            this.data.setUint16(offset, currentVersion << 1);

        } else {
            console.log(`position animation @${idx} is at max version`);
        }

        if (this.minIdx == idx) {
            for (let i = idx; i <= this.maxIdx; i++) {
                if (this.data.getUint16(i * ANIM_POS_BYTES_PER_ELEMENT + ANIM_POS_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    this.minIdx = i;
                    break;
                }
            }
            if (this.minIdx == idx)
                this.minIdx = this.maxIdx;
        }

        if (this.maxIdx == idx) {
            for (let i = idx; i >= this.minIdx; i--) {
                if (this.data.getUint16(i * ANIM_POS_BYTES_PER_ELEMENT + ANIM_POS_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    this.maxIdx = i;
                    break;
                }
            }
            if (this.maxIdx == idx)
                this.maxIdx = this.minIdx;
        }

        const sprite = this.data.getUint32(offset + ANIM_POS_SPRITE_OFFSET);
        Sprites.clearFlag(sprite >> VERSION_BITS, SPRITE_POS_LIN_ANIM_FLAG);
    }
    ,
    removeBy(sprite) {
        let idx;
        for (idx = 0; idx < ANIM_POS_MAX_ELEMENTS; idx++) {

            const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;
            const flags = this.data.getUint16(offset + ANIM_POS_VERSION_N_STATE_OFFSET);

            if (flags & ACTIVE_FLAG && sprite == this.data.getUint32(offset + ANIM_POS_SPRITE_OFFSET, sprite)) {
                this.remove(idx);
                break;
            }
        }
    }
});

export default PositionAnimations;
