import {
    ACTIVE_FLAG,
    VERSION_BITS,
    VERSION_MASK,
    MAX_VERSION,
    INVALID_INDEX
} from '../constants/BaseECS.js';
import Sprites from '../Sprites.js';
import { renderStore as $ } from '../setupWebGL.js';
import { SPRITE_SCALE_ANIM_FLAG } from '../constants/SpriteBuffer.js';
import {
    ANIM_SCALE_MAX_ELEMENTS,
    ANIM_SCALE_BYTES_PER_ELEMENT,
    ANIM_SCALE_BUFFER_SIZE,
    ANIM_SCALE_VERSION_N_STATE_OFFSET,
    ANIM_SCALE_TIMING_N_INFO_OFFSET,
    ANIM_SCALE_SPRITE_OFFSET,
    ANIM_SCALE_START_OFFSET,
    ANIM_SCALE_END_OFFSET,
    ANIM_SCALE_FROM_OFFSET,
    ANIM_SCALE_TO_OFFSET,
    ANIM_SCALE_INFO_BITS,
    ANIM_SCALE_CALLBACK_FLAG,
    ANIM_SCALE_LOOP_FLAG,
    ANIM_SCALE_CB_KEY
} from '../constants/AnimationBuffer.js';

const ScaleAnimations = Object.seal({
    data: new DataView(new ArrayBuffer(ANIM_SCALE_BUFFER_SIZE)),
    callbacks: new Map(),

    count: 0,
    minIdx: 0,
    maxIdx: 0,

    getIndex(id) {
        const idx = id >> VERSION_BITS;
        const version = id & VERSION_MASK;
        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT + ANIM_SCALE_VERSION_N_STATE_OFFSET;
        const currentVersion = this.data.getUint16(offset) >> 1;

        if (version == currentVersion)
            return idx;
        return INVALID_INDEX;
    }
    ,
    create(sprite, duration, toValue, timing) {
        let idx;
        let version;
        for (idx = 0; idx < ANIM_SCALE_MAX_ELEMENTS; idx++) {

            const flags = this.data.getUint16(idx * ANIM_SCALE_BYTES_PER_ELEMENT + ANIM_SCALE_VERSION_N_STATE_OFFSET);

            if (!(flags & ACTIVE_FLAG)) {

                version = flags >> 1;
                this.data.setUint16(idx * ANIM_SCALE_BYTES_PER_ELEMENT + ANIM_SCALE_VERSION_N_STATE_OFFSET, flags | ACTIVE_FLAG);

                break;
            }
        }

        if (idx == undefined)
            throw new Error('could not create new scale animation, probably no space left');

        this.count++;

        if (this.minIdx > idx)
            this.minIdx = idx;

        if (this.maxIdx < idx)
            this.maxIdx = idx;

        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;

        this.data.setUint16(offset + ANIM_SCALE_TIMING_N_INFO_OFFSET, timing << ANIM_SCALE_INFO_BITS);

        this.data.setUint32(offset + ANIM_SCALE_SPRITE_OFFSET, sprite);
        this.data.setUint32(offset + ANIM_SCALE_START_OFFSET, $.frame);
        this.data.setUint32(offset + ANIM_SCALE_END_OFFSET, $.frame + duration);
        const spriteIdx = sprite >> VERSION_BITS;
        this.data.setFloat32(offset + ANIM_SCALE_FROM_OFFSET, Sprites.getScale(spriteIdx));
        this.data.setFloat32(offset + ANIM_SCALE_TO_OFFSET, toValue);

        Sprites.setFlag(spriteIdx, SPRITE_SCALE_ANIM_FLAG);

        return idx << VERSION_BITS | version;
    }
    ,
    setLoop(idx, loop) {
        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;
        const info = this.data.getUint16(offset + ANIM_SCALE_TIMING_N_INFO_OFFSET);

        this.data.setUint16(offset + ANIM_SCALE_TIMING_N_INFO_OFFSET, loop ? info | ANIM_SCALE_LOOP_FLAG : info & ~ANIM_SCALE_LOOP_FLAG);
    }
    ,
    setCallback(idx, callback) {
        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;
        const info = this.data.getUint16(offset + ANIM_SCALE_TIMING_N_INFO_OFFSET);

        this.data.setUint16(offset + ANIM_SCALE_TIMING_N_INFO_OFFSET, info | ANIM_SCALE_CALLBACK_FLAG);
        this.callbacks.set(ANIM_SCALE_CB_KEY + idx, callback);
    }
    ,
    restart(idx) {
        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;
        const duration = this.data.getUint32(offset + ANIM_SCALE_END_OFFSET) - this.data.getUint32(offset + ANIM_SCALE_START_OFFSET);
        this.data.setUint32(offset + ANIM_SCALE_START_OFFSET, $.frame);
        this.data.setUint32(offset + ANIM_SCALE_END_OFFSET, $.frame + duration);
    }
    ,
    delay(idx, duration) {
        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;
        const length = this.data.getUint32(offset + ANIM_SCALE_END_OFFSET) - this.data.getUint32(offset + ANIM_SCALE_START_OFFSET);
        this.data.setUint32(offset + ANIM_SCALE_START_OFFSET, $.frame + duration);
        this.data.setUint32(offset + ANIM_SCALE_END_OFFSET, $.frame + duration + length);
    }
    ,
    remove(idx) {
        this.count--;

        const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT + ANIM_SCALE_VERSION_N_STATE_OFFSET;

        let currentVersion = this.data.getUint16(offset) >> 1;

        if (currentVersion < MAX_VERSION) {
            currentVersion++; // increase version
            this.data.setUint16(offset, currentVersion << 1);

        } else {
            console.log(`scale animation @${idx} is at max version`);
        }

        if (this.minIdx == idx) {
            for (let i = idx; i <= this.maxIdx; i++) {
                if (this.data.getUint16(i * ANIM_SCALE_BYTES_PER_ELEMENT + ANIM_SCALE_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    this.minIdx = i;
                    break;
                }
            }
            if (this.minIdx == idx)
                this.minIdx = this.maxIdx;
        }

        if (this.maxIdx == idx) {
            for (let i = idx; i >= this.minIdx; i--) {
                if (this.data.getUint16(i * ANIM_SCALE_BYTES_PER_ELEMENT + ANIM_SCALE_VERSION_N_STATE_OFFSET) & ACTIVE_FLAG) {
                    this.maxIdx = i;
                    break;
                }
            }
            if (this.maxIdx == idx)
                this.maxIdx = this.minIdx;
        }

        const sprite = this.data.getUint32(offset + ANIM_SCALE_SPRITE_OFFSET);
        Sprites.clearFlag(sprite >> VERSION_BITS, SPRITE_SCALE_ANIM_FLAG);
    }
    ,
    removeBy(sprite) {
        let idx;
        for (idx = 0; idx < ANIM_SCALE_MAX_ELEMENTS; idx++) {

            const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;
            const flags = this.data.getUint16(offset + ANIM_SCALE_VERSION_N_STATE_OFFSET);

            if (flags & ACTIVE_FLAG && sprite == this.data.getUint32(offset + ANIM_SCALE_SPRITE_OFFSET, sprite)) {
                this.remove(idx);
                break;
            }
        }
    }
});

export default ScaleAnimations;
