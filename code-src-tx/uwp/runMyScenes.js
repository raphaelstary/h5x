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
import Audio from '../audio/Audio.js';
import FontSubImage from '../../code-gen/FontSubImage.js';
import {DIM_ELEMENTS} from '../render/constants/DimBuffer.js';
import {assetStore as a$} from '../render/setupWebGL.js';

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

    /////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////

    const k_x = 0;
    const k_y = 0;
    const k_z = -0.5;

    // const a = Sprites.create(FontSubImage.get('a'), a_x, a_y, a_z);
    // const k = Sprites.create(FontSubImage.get('k'), k_x, k_y, k_z);
    //
    let x = -8.5;
    FontSubImage.forEach((value, key) => {

        const dimIdx = value * DIM_ELEMENTS;
        const widthHalf = a$.spriteDimensions[dimIdx];
        x += widthHalf;
        const char = Sprites.create(value, x, 0, -1);
        x += widthHalf;
        x += 0.05;

    });

    const kingOfSpades = Sprites.create(SubImage.CARD_SK, k_x, k_y);

    const bulletHole = Sprites.create(SubImage.BULLET_HOLE_GREEN, 0, 0, -2);


    const animId = Rot1DAnimations.create(aceOfSpades, ANIM_ROT1D_Y_FLAG, 60, Math.PI, LINEAR);
    PositionCurveAnimations.create(aceOfSpades, 60, a_x, a_y, b_z, d_x, a_y, b_z, d_x, a_y, a_z, LINEAR);

    Audio.playSound(SFXSegment.SIMPLEST_GUNSHOT);
}
