import {
    ANIM_COLOR1C_BYTES_PER_ELEMENT,
    ANIM_COLOR1C_CALLBACK_FLAG,
    ANIM_COLOR1C_CB_KEY,
    ANIM_COLOR1C_END_OFFSET,
    ANIM_COLOR1C_FROM_OFFSET,
    ANIM_COLOR1C_INFO_BITS,
    ANIM_COLOR1C_LOOP_FLAG,
    ANIM_COLOR1C_SPRITE_OFFSET,
    ANIM_COLOR1C_START_OFFSET,
    ANIM_COLOR1C_TIMING_N_INFO_OFFSET,
    ANIM_COLOR1C_TO_OFFSET,
    ANIM_COLOR1C_VERSION_N_STATE_OFFSET,
    ANIM_POS_BYTES_PER_ELEMENT,
    ANIM_POS_CALLBACK_FLAG,
    ANIM_POS_CB_KEY,
    ANIM_POS_END_OFFSET,
    ANIM_POS_FROM_X_OFFSET,
    ANIM_POS_FROM_Y_OFFSET,
    ANIM_POS_FROM_Z_OFFSET,
    ANIM_POS_INFO_BITS,
    ANIM_POS_LOOP_FLAG,
    ANIM_POS_SPRITE_OFFSET,
    ANIM_POS_START_OFFSET,
    ANIM_POS_TIMING_N_INFO_OFFSET,
    ANIM_POS_TO_X_OFFSET,
    ANIM_POS_TO_Y_OFFSET,
    ANIM_POS_TO_Z_OFFSET,
    ANIM_POS_VERSION_N_STATE_OFFSET,
    ANIM_POSC_A_X_OFFSET,
    ANIM_POSC_A_Y_OFFSET,
    ANIM_POSC_A_Z_OFFSET,
    ANIM_POSC_B_X_OFFSET,
    ANIM_POSC_B_Y_OFFSET,
    ANIM_POSC_B_Z_OFFSET,
    ANIM_POSC_BYTES_PER_ELEMENT,
    ANIM_POSC_C_X_OFFSET,
    ANIM_POSC_C_Y_OFFSET,
    ANIM_POSC_C_Z_OFFSET,
    ANIM_POSC_CALLBACK_FLAG,
    ANIM_POSC_CB_KEY,
    ANIM_POSC_D_X_OFFSET,
    ANIM_POSC_D_Y_OFFSET,
    ANIM_POSC_D_Z_OFFSET,
    ANIM_POSC_END_OFFSET,
    ANIM_POSC_INFO_BITS,
    ANIM_POSC_LOOP_FLAG,
    ANIM_POSC_SPRITE_OFFSET,
    ANIM_POSC_START_OFFSET,
    ANIM_POSC_TIMING_N_INFO_OFFSET,
    ANIM_POSC_VERSION_N_STATE_OFFSET,
    ANIM_ROT1D_BYTES_PER_ELEMENT,
    ANIM_ROT1D_CALLBACK_FLAG,
    ANIM_ROT1D_CB_KEY,
    ANIM_ROT1D_END_OFFSET,
    ANIM_ROT1D_FROM_OFFSET,
    ANIM_ROT1D_INFO_BITS,
    ANIM_ROT1D_LOOP_FLAG,
    ANIM_ROT1D_SPRITE_OFFSET,
    ANIM_ROT1D_START_OFFSET,
    ANIM_ROT1D_TIMING_N_INFO_OFFSET,
    ANIM_ROT1D_TO_OFFSET,
    ANIM_ROT1D_VERSION_N_STATE_OFFSET,
    ANIM_ROT1D_X_FLAG,
    ANIM_ROT1D_Y_FLAG,
    ANIM_ROT1D_Z_FLAG,
    ANIM_SCALE_BYTES_PER_ELEMENT,
    ANIM_SCALE_CALLBACK_FLAG,
    ANIM_SCALE_CB_KEY,
    ANIM_SCALE_END_OFFSET,
    ANIM_SCALE_FROM_OFFSET,
    ANIM_SCALE_INFO_BITS,
    ANIM_SCALE_LOOP_FLAG,
    ANIM_SCALE_SPRITE_OFFSET,
    ANIM_SCALE_START_OFFSET,
    ANIM_SCALE_TIMING_N_INFO_OFFSET,
    ANIM_SCALE_TO_OFFSET,
    ANIM_SCALE_VERSION_N_STATE_OFFSET
} from '../render/constants/AnimationBuffer.js';
import Color1CAnimations from '../render/animations/Color1CAnimations.js';
import PositionAnimations from '../render/animations/PositionAnimations.js';
import PositionCurveAnimations from '../render/animations/PositionCurveAnimations.js';
import Rot1DAnimations from '../render/animations/Rot1DAnimations.js';
import ScaleAnimations from '../render/animations/ScaleAnimations.js';
import map, { LINEAR, nonLinearTransform } from '../render/animations/Transform.js';
import { ACTIVE_FLAG, VERSION_BITS } from '../render/constants/BaseECS.js';
import HUDSprites from '../render/HUDSprites.js';
import { COLORS_CHANGED, POS_CHANGED, XFORMS_CHANGED } from '../render/constants/ChangeFlag.js';
import { COLOR_ALPHA_OFFSET, COLOR_ELEMENTS } from '../render/constants/ColorBuffer.js';
import { POS_ELEMENTS, POS_X_OFFSET, POS_Y_OFFSET, POS_Z_OFFSET } from '../render/constants/PosBuffer.js';
import { XFORMS_ELEMENTS, XFORMS_ROTATION_X_OFFSET, XFORMS_ROTATION_Y_OFFSET, XFORMS_ROTATION_Z_OFFSET, XFORMS_SCALE_OFFSET } from '../render/constants/XFormsBuffer.js';
import { renderStore as $ } from '../render/setupWebGL.js';
import drawFrame from '../render/drawFrame.js';
/* global FontSubImage */

let startTime = Date.now();
let prevTime = startTime;
let msMax = 0;
let fpsMin = 99;
let meterFrameCounter = 0;

let stop = false;

export function stopLoop() {
    stop = true;
}

export function resetLoop() {
    stop = false;
}

/*
 * EVENT LOOP
 */
export default function eventLoop(updateFunctions, drawFunction = drawFrame) {
    if (stop) {
        return;
    }

    requestAnimationFrame(eventLoop.bind(undefined, updateFunctions, drawFunction));

    // fps meter start frame
    {
        startTime = Date.now();
    }

    // capture gamepad input et al.
    updateFunctions.forEach(fn => fn());

    // animate frame
    {
        if (ScaleAnimations.count > 0) {
            let idx;
            for (idx = ScaleAnimations.minIdx; idx <= ScaleAnimations.maxIdx; idx++) {
                const offset = idx * ANIM_SCALE_BYTES_PER_ELEMENT;
                const flags = ScaleAnimations.data.getUint16(offset + ANIM_SCALE_VERSION_N_STATE_OFFSET);
                if (flags & ACTIVE_FLAG) {

                    const start = ScaleAnimations.data.getUint32(offset + ANIM_SCALE_START_OFFSET);
                    if (start > $.frame)
                        continue;

                    const info = ScaleAnimations.data.getUint16(offset + ANIM_SCALE_TIMING_N_INFO_OFFSET);
                    const sprite = ScaleAnimations.data.getUint32(offset + ANIM_SCALE_SPRITE_OFFSET);
                    const end = ScaleAnimations.data.getUint32(offset + ANIM_SCALE_END_OFFSET);
                    const from = ScaleAnimations.data.getFloat32(offset + ANIM_SCALE_FROM_OFFSET);
                    const to = ScaleAnimations.data.getFloat32(offset + ANIM_SCALE_TO_OFFSET);

                    const timing = info >> ANIM_SCALE_INFO_BITS;
                    const nextScaleValue = map($.frame, start, end, from, to, timing);

                    const spriteIdx = sprite >> VERSION_BITS; //getIndex(sprite);
                    {
                        $.xforms[spriteIdx * XFORMS_ELEMENTS + XFORMS_SCALE_OFFSET] = nextScaleValue;
                        $.changeFlags |= XFORMS_CHANGED;
                    }

                    if (end == $.frame) {
                        if (info & ANIM_SCALE_LOOP_FLAG) {
                            ScaleAnimations.data.setUint32(offset + ANIM_SCALE_START_OFFSET, $.frame);
                            ScaleAnimations.data.setUint32(offset + ANIM_SCALE_END_OFFSET, $.frame + (end - start));

                            if (info & ANIM_SCALE_CALLBACK_FLAG) {
                                ScaleAnimations.callbacks.get(ANIM_SCALE_CB_KEY + idx)();
                            }
                        } else {
                            ScaleAnimations.remove(idx);

                            if (info & ANIM_SCALE_CALLBACK_FLAG) {
                                ScaleAnimations.callbacks.get(ANIM_SCALE_CB_KEY + idx)();
                                ScaleAnimations.callbacks.delete(ANIM_SCALE_CB_KEY + idx);
                            }
                        }
                    }
                }
            }
        }

        if (Rot1DAnimations.count > 0) {
            let idx;
            for (idx = Rot1DAnimations.minIdx; idx <= Rot1DAnimations.maxIdx; idx++) {
                const offset = idx * ANIM_ROT1D_BYTES_PER_ELEMENT;
                const flags = Rot1DAnimations.data.getUint16(offset + ANIM_ROT1D_VERSION_N_STATE_OFFSET);
                if (flags & ACTIVE_FLAG) {

                    const start = Rot1DAnimations.data.getUint32(offset + ANIM_ROT1D_START_OFFSET);
                    if (start > $.frame)
                        continue;

                    const info = Rot1DAnimations.data.getUint16(offset + ANIM_ROT1D_TIMING_N_INFO_OFFSET);
                    const sprite = Rot1DAnimations.data.getUint32(offset + ANIM_ROT1D_SPRITE_OFFSET);
                    const end = Rot1DAnimations.data.getUint32(offset + ANIM_ROT1D_END_OFFSET);
                    const from = Rot1DAnimations.data.getFloat32(offset + ANIM_ROT1D_FROM_OFFSET);
                    const to = Rot1DAnimations.data.getFloat32(offset + ANIM_ROT1D_TO_OFFSET);

                    const timing = info >> ANIM_ROT1D_INFO_BITS;
                    const nextRot1DValue = map($.frame, start, end, from, to, timing);

                    const spriteIdx = sprite >> VERSION_BITS; //getIndex(sprite);
                    {
                        if (info & ANIM_ROT1D_X_FLAG)
                            $.xforms[spriteIdx * XFORMS_ELEMENTS + XFORMS_ROTATION_X_OFFSET] = nextRot1DValue;
                        else if (info & ANIM_ROT1D_Y_FLAG)
                            $.xforms[spriteIdx * XFORMS_ELEMENTS + XFORMS_ROTATION_Y_OFFSET] = nextRot1DValue;
                        else if (info & ANIM_ROT1D_Z_FLAG)
                            $.xforms[spriteIdx * XFORMS_ELEMENTS + XFORMS_ROTATION_Z_OFFSET] = nextRot1DValue;
                        $.changeFlags |= XFORMS_CHANGED;
                    }

                    if (end == $.frame) {
                        if (info & ANIM_ROT1D_LOOP_FLAG) {
                            Rot1DAnimations.data.setUint32(offset + ANIM_ROT1D_START_OFFSET, $.frame);
                            Rot1DAnimations.data.setUint32(offset + ANIM_ROT1D_END_OFFSET, $.frame + (end - start));

                            if (info & ANIM_ROT1D_CALLBACK_FLAG) {
                                Rot1DAnimations.callbacks.get(ANIM_ROT1D_CB_KEY + idx)();
                            }
                        } else {
                            Rot1DAnimations.remove(idx);

                            if (info & ANIM_ROT1D_CALLBACK_FLAG) {
                                Rot1DAnimations.callbacks.get(ANIM_ROT1D_CB_KEY + idx)();
                                Rot1DAnimations.callbacks.delete(ANIM_ROT1D_CB_KEY + idx);
                            }
                        }
                    }
                }
            }
        }

        if (Color1CAnimations.count > 0) {
            let idx;
            for (idx = Color1CAnimations.minIdx; idx <= Color1CAnimations.maxIdx; idx++) {
                const offset = idx * ANIM_COLOR1C_BYTES_PER_ELEMENT;
                const flags = Color1CAnimations.data.getUint16(offset + ANIM_COLOR1C_VERSION_N_STATE_OFFSET);
                if (flags & ACTIVE_FLAG) {

                    const start = Color1CAnimations.data.getUint32(offset + ANIM_COLOR1C_START_OFFSET);
                    if (start > $.frame)
                        continue;

                    const info = Color1CAnimations.data.getUint16(offset + ANIM_COLOR1C_TIMING_N_INFO_OFFSET);
                    const sprite = Color1CAnimations.data.getUint32(offset + ANIM_COLOR1C_SPRITE_OFFSET);
                    const end = Color1CAnimations.data.getUint32(offset + ANIM_COLOR1C_END_OFFSET);
                    const from = Color1CAnimations.data.getFloat32(offset + ANIM_COLOR1C_FROM_OFFSET);
                    const to = Color1CAnimations.data.getFloat32(offset + ANIM_COLOR1C_TO_OFFSET);

                    const timing = info >> ANIM_COLOR1C_INFO_BITS;
                    const nextColor1CValue = map($.frame, start, end, from, to, timing);

                    const spriteIdx = sprite >> VERSION_BITS; //getIndex(sprite);
                    {
                        $.colors[spriteIdx * COLOR_ELEMENTS + COLOR_ALPHA_OFFSET] = nextColor1CValue;
                        $.changeFlags |= COLORS_CHANGED;
                    }

                    if (end == $.frame) {
                        if (info & ANIM_COLOR1C_LOOP_FLAG) {
                            Color1CAnimations.data.setUint32(offset + ANIM_COLOR1C_START_OFFSET, $.frame);
                            Color1CAnimations.data.setUint32(offset + ANIM_COLOR1C_END_OFFSET, $.frame + (end - start));

                            if (info & ANIM_COLOR1C_CALLBACK_FLAG) {
                                Color1CAnimations.callbacks.get(ANIM_COLOR1C_CB_KEY + idx)();
                            }
                        } else {
                            Color1CAnimations.remove(idx);

                            if (info & ANIM_COLOR1C_CALLBACK_FLAG) {
                                Color1CAnimations.callbacks.get(ANIM_COLOR1C_CB_KEY + idx)();
                                Color1CAnimations.callbacks.delete(ANIM_COLOR1C_CB_KEY + idx);
                            }
                        }
                    }
                }
            }
        }

        if (PositionAnimations.count > 0) {
            let idx;
            for (idx = PositionAnimations.minIdx; idx <= PositionAnimations.maxIdx; idx++) {
                const offset = idx * ANIM_POS_BYTES_PER_ELEMENT;
                const flags = PositionAnimations.data.getUint16(offset + ANIM_POS_VERSION_N_STATE_OFFSET);
                if (flags & ACTIVE_FLAG) {

                    const start = PositionAnimations.data.getUint32(offset + ANIM_POS_START_OFFSET);
                    if (start > $.frame)
                        continue;

                    const info = PositionAnimations.data.getUint16(offset + ANIM_POS_TIMING_N_INFO_OFFSET);
                    const sprite = PositionAnimations.data.getUint32(offset + ANIM_POS_SPRITE_OFFSET);
                    const end = PositionAnimations.data.getUint32(offset + ANIM_POS_END_OFFSET);

                    const fromX = PositionAnimations.data.getFloat32(offset + ANIM_POS_FROM_X_OFFSET);
                    const toX = PositionAnimations.data.getFloat32(offset + ANIM_POS_TO_X_OFFSET);

                    const fromY = PositionAnimations.data.getFloat32(offset + ANIM_POS_FROM_Y_OFFSET);
                    const toY = PositionAnimations.data.getFloat32(offset + ANIM_POS_TO_Y_OFFSET);

                    const fromZ = PositionAnimations.data.getFloat32(offset + ANIM_POS_FROM_Z_OFFSET);
                    const toZ = PositionAnimations.data.getFloat32(offset + ANIM_POS_TO_Z_OFFSET);

                    const timing = info >> ANIM_POS_INFO_BITS;

                    const tNormalized = ($.frame - start) / (end - start);

                    const t = timing == LINEAR ?
                        tNormalized : nonLinearTransform(tNormalized, timing);

                    const nextPosXValue = fromX + t * (toX - fromX);
                    const nextPosYValue = fromY + t * (toY - fromY);
                    const nextPosZValue = fromZ + t * (toZ - fromZ);

                    const spriteIdx = sprite >> VERSION_BITS; //getIndex(sprite);
                    {
                        $.positions[spriteIdx * POS_ELEMENTS + POS_X_OFFSET] = nextPosXValue;
                        $.positions[spriteIdx * POS_ELEMENTS + POS_Y_OFFSET] = nextPosYValue;
                        $.positions[spriteIdx * POS_ELEMENTS + POS_Z_OFFSET] = nextPosZValue;

                        $.changeFlags |= POS_CHANGED;
                    }

                    if (end == $.frame) {
                        if (info & ANIM_POS_LOOP_FLAG) {
                            PositionAnimations.data.setUint32(offset + ANIM_POS_START_OFFSET, $.frame);
                            PositionAnimations.data.setUint32(offset + ANIM_POS_END_OFFSET, $.frame + (end - start));

                            if (info & ANIM_POS_CALLBACK_FLAG) {
                                PositionAnimations.callbacks.get(ANIM_POS_CB_KEY + idx)();
                            }
                        } else {
                            PositionAnimations.remove(idx);

                            if (info & ANIM_POS_CALLBACK_FLAG) {
                                PositionAnimations.callbacks.get(ANIM_POS_CB_KEY + idx)();
                                PositionAnimations.callbacks.delete(ANIM_POS_CB_KEY + idx);
                            }
                        }
                    }
                }
            }
        }

        if (PositionCurveAnimations.count > 0) {
            let idx;
            for (idx = PositionCurveAnimations.minIdx; idx <= PositionCurveAnimations.maxIdx; idx++) {
                const offset = idx * ANIM_POSC_BYTES_PER_ELEMENT;
                const flags = PositionCurveAnimations.data.getUint16(offset + ANIM_POSC_VERSION_N_STATE_OFFSET);
                if (flags & ACTIVE_FLAG) {

                    const start = PositionCurveAnimations.data.getUint32(offset + ANIM_POSC_START_OFFSET);
                    if (start > $.frame)
                        continue;

                    const info = PositionCurveAnimations.data.getUint16(offset + ANIM_POSC_TIMING_N_INFO_OFFSET);
                    const sprite = PositionCurveAnimations.data.getUint32(offset + ANIM_POSC_SPRITE_OFFSET);
                    const end = PositionCurveAnimations.data.getUint32(offset + ANIM_POSC_END_OFFSET);

                    const aX = PositionCurveAnimations.data.getFloat32(offset + ANIM_POSC_A_X_OFFSET);
                    const aY = PositionCurveAnimations.data.getFloat32(offset + ANIM_POSC_A_Y_OFFSET);
                    const aZ = PositionCurveAnimations.data.getFloat32(offset + ANIM_POSC_A_Z_OFFSET);

                    const bX = PositionCurveAnimations.data.getFloat32(offset + ANIM_POSC_B_X_OFFSET);
                    const bY = PositionCurveAnimations.data.getFloat32(offset + ANIM_POSC_B_Y_OFFSET);
                    const bZ = PositionCurveAnimations.data.getFloat32(offset + ANIM_POSC_B_Z_OFFSET);

                    const cX = PositionCurveAnimations.data.getFloat32(offset + ANIM_POSC_C_X_OFFSET);
                    const cY = PositionCurveAnimations.data.getFloat32(offset + ANIM_POSC_C_Y_OFFSET);
                    const cZ = PositionCurveAnimations.data.getFloat32(offset + ANIM_POSC_C_Z_OFFSET);

                    const dX = PositionCurveAnimations.data.getFloat32(offset + ANIM_POSC_D_X_OFFSET);
                    const dY = PositionCurveAnimations.data.getFloat32(offset + ANIM_POSC_D_Y_OFFSET);
                    const dZ = PositionCurveAnimations.data.getFloat32(offset + ANIM_POSC_D_Z_OFFSET);

                    const timing = info >> ANIM_POSC_INFO_BITS;

                    const tNormalized = ($.frame - start) / (end - start);

                    const t = timing == LINEAR ?
                        tNormalized : nonLinearTransform(tNormalized, timing);

                    const s = 1 - t;
                    const s2 = s * s;
                    const s3 = s2 * s;
                    const t2 = t * t;
                    const t3 = t2 * t;

                    const nextPosXValue = s3 * aX + 3 * s2 * t * bX + 3 * s * t2 * cX + t3 * dX;
                    const nextPosYValue = s3 * aY + 3 * s2 * t * bY + 3 * s * t2 * cY + t3 * dY;
                    const nextPosZValue = s3 * aZ + 3 * s2 * t * bZ + 3 * s * t2 * cZ + t3 * dZ;

                    const spriteIdx = sprite >> VERSION_BITS; //getIndex(sprite);
                    {
                        $.positions[spriteIdx * POS_ELEMENTS + POS_X_OFFSET] = nextPosXValue;
                        $.positions[spriteIdx * POS_ELEMENTS + POS_Y_OFFSET] = nextPosYValue;
                        $.positions[spriteIdx * POS_ELEMENTS + POS_Z_OFFSET] = nextPosZValue;

                        $.changeFlags |= POS_CHANGED;
                    }

                    if (end == $.frame) {
                        if (info & ANIM_POSC_LOOP_FLAG) {
                            PositionCurveAnimations.data.setUint32(offset + ANIM_POSC_START_OFFSET, $.frame);
                            PositionCurveAnimations.data.setUint32(offset + ANIM_POSC_END_OFFSET, $.frame + (end - start));

                            if (info & ANIM_POSC_CALLBACK_FLAG) {
                                PositionCurveAnimations.callbacks.get(ANIM_POSC_CB_KEY + idx)();
                            }
                        } else {
                            PositionCurveAnimations.remove(idx);

                            if (info & ANIM_POSC_CALLBACK_FLAG) {
                                PositionCurveAnimations.callbacks.get(ANIM_POSC_CB_KEY + idx)();
                                PositionCurveAnimations.callbacks.delete(ANIM_POSC_CB_KEY + idx);
                            }
                        }
                    }
                }
            }
        }

        $.frame++;
    }

    // draw frame
    drawFunction();

    // fps meter end frame
    {
        const time = Date.now();

        const ms = time - startTime;
        msMax = Math.max(msMax, ms);

        meterFrameCounter++;

        if (time > prevTime + 1000) {

            if (ms < 100) {
                HUDSprites.setSubImage(5, FontSubImage.get(Math.floor(ms / 10)));
                HUDSprites.setSubImage(6, FontSubImage.get(ms % 10));
            } else {
                HUDSprites.setSubImage(5, FontSubImage.get('X'));
                HUDSprites.setSubImage(6, FontSubImage.get('X'));
            }

            if (msMax < 100) {
                HUDSprites.setSubImage(14, FontSubImage.get(Math.floor(msMax / 10)));
                HUDSprites.setSubImage(15, FontSubImage.get(msMax % 10));
            } else {
                HUDSprites.setSubImage(14, FontSubImage.get('X'));
                HUDSprites.setSubImage(15, FontSubImage.get('X'));
            }

            const fps = Math.round(meterFrameCounter * 1000 / (time - prevTime));
            fpsMin = Math.min(fpsMin, fps);

            if (fps < 100) {
                HUDSprites.setSubImage(0, FontSubImage.get(Math.floor(fps / 10)));
                HUDSprites.setSubImage(1, FontSubImage.get(fps % 10));
            } else {
                HUDSprites.setSubImage(0, FontSubImage.get('X'));
                HUDSprites.setSubImage(1, FontSubImage.get('X'));
            }

            if (fpsMin < 100) {
                HUDSprites.setSubImage(9, FontSubImage.get(Math.floor(fpsMin / 10)));
                HUDSprites.setSubImage(10, FontSubImage.get(fpsMin % 10));
            } else {
                HUDSprites.setSubImage(9, FontSubImage.get('X'));
                HUDSprites.setSubImage(10, FontSubImage.get('X'));
            }

            prevTime = time;
            meterFrameCounter = 0;
            if ($.frame % 10 * 60 == 0) {
                fpsMin = fps;
                msMax = ms;
            }
        }
    }
}
