import * as SFXSegment from '../../code-gen/SFXSegment.js';
import * as SubImage from '../../code-gen/SubImage.js';
import {
    LEFT_TRIGGER_HALF,
    NONE,
    RIGHT_TRIGGER_HALF
} from '../uwp-input/Vibration.js';
import VibrationFrame from '../uwp-input/VibrationFrame.js';
import PositionCurveAnimations from '../render/animations/PositionCurveAnimations.js';
import Rot1DAnimations, {ANIM_ROT1D_Y_FLAG} from '../render/animations/Rot1DAnimations.js';
import {LINEAR} from '../render/animations/Transform.js';
import Sprites from '../render/Sprites.js';
import {VERSION_BITS} from '../render/constants/BaseECS.js';

export let heartBeatFrames;

export default function runMyScenes() {
    const a_x = -1;
    const a_y = 0;
    const a_z = -5;

    const aceOfSpades = Sprites.create(SubImage.CARD_SA, a_x, a_y);

    const radius = Sprites.getWidthHalf(aceOfSpades >> VERSION_BITS);

    const b_z = a_z + radius * 4 / 3;
    const d_x = a_x + 2 * radius;

    Rot1DAnimations.create(aceOfSpades, ANIM_ROT1D_Y_FLAG, 60, Math.PI, LINEAR);
    PositionCurveAnimations.create(aceOfSpades, 60, a_x, a_y, b_z, d_x, a_y, b_z, d_x, a_y, a_z, LINEAR);

    Audio.playSound(SFXSegment.SIMPLEST_GUNSHOT);

    const holdNoVibration = new VibrationFrame(NONE, 30);
    const shortLeftTrigger = new VibrationFrame(LEFT_TRIGGER_HALF, 15);
    const shortRightTrigger = new VibrationFrame(RIGHT_TRIGGER_HALF, 15);

    heartBeatFrames = Object.freeze([
        shortLeftTrigger,
        holdNoVibration,
        shortRightTrigger,
        holdNoVibration,
        shortLeftTrigger,
        holdNoVibration,
        shortRightTrigger,
        holdNoVibration
    ]);
}
