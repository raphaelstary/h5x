import FontSubImage from '../../code-gen/FontSubImage.js';
import * as SubImage from '../../code-gen/SubImage.js';
import * as SFXSegment from '../../code-gen/SFXSegment.js';
import {DIM_ELEMENTS} from '../render/constants/DimBuffer.js';
import {
    assetStore as a$,
    addAvatarAtlas
} from '../render/setupWebGL.js';
import Audio from '../audio/Audio.js';
import {VERSION_BITS} from '../render/constants/BaseECS.js';
import Sprites from '../render/Sprites.js';
import Rot1DAnimations, {ANIM_ROT1D_Y_FLAG} from '../render/animations/Rot1DAnimations.js';
import PositionCurveAnimations from '../render/animations/PositionCurveAnimations.js';
import {LINEAR} from '../render/animations/Transform.js';
import {loadAvatars} from '../net/loadAssets.js';
import createAtlas from '../platform/createAtlas.js';

export default function runTestScene() {
    const a_x = -0.1;
    const a_y = 0;
    const a_z = -0.5;

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
    const aceOfSpades = Sprites.create(SubImage.CARD_SA, a_x, a_y);

    const bulletHole = Sprites.create(SubImage.BULLET_HOLE_GREEN, 0, 0, -2);


    const radius = Sprites.getWidthHalf(aceOfSpades >> VERSION_BITS);

    const b_z = a_z + radius * 4 / 3;
    const d_x = a_x + 2 * radius;

    const animId = Rot1DAnimations.create(aceOfSpades, ANIM_ROT1D_Y_FLAG, 60, Math.PI, LINEAR);
    PositionCurveAnimations.create(aceOfSpades, 60, a_x, a_y, b_z, d_x, a_y, b_z, d_x, a_y, a_z, LINEAR);

    Audio.playSound(SFXSegment.SIMPLEST_GUNSHOT);

    const avatarInfos = [
        {name: 'raphael', url: 'https://www.gravatar.com/avatar/d2e80a9d1c6e3a794bcfabe93b32a572'},
        {name: 'thomas', url: 'https://www.gravatar.com/avatar/24aae591d78a51f98e461186173ef3e9'},
        {name: 'kev', url: 'https://www.gravatar.com/avatar/b4466a237baa1c4accab612d746e3ba9'},
        {name: 'flo', url: 'https://www.gravatar.com/avatar/081b29f0c6df111eb15a95c8a89f0049'}
    ];

    loadAvatars(avatarInfos)
        .then(createAtlas)
        .then(({atlas, info}) => {
            addAvatarAtlas(atlas, info);

            Sprites.create(a$.avatarSubImages.get('raphael'), 0, 0, -1);
        });
}
