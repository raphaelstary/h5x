import * as SubImages from '../../code-gen/SubImage.js';
import Sprites from '../render/Sprites.js';

export default function runMyScenes() {
    Sprites.create(SubImages.CARD_C6, 0, -1, -2.5);

    Sprites.create(SubImages.CARD_C6, -1, -1, -2.5);
    Sprites.create(SubImages.CARD_C6, 1, -1, -2.5);

    Sprites.create(SubImages.CARD_C6, -2, -1, -2.5);
    Sprites.create(SubImages.CARD_C6, 0, -1, -2.5);
    Sprites.create(SubImages.CARD_C6, 2, -1, -2.5);

    Sprites.create(SubImages.CARD_C6, -1, -1, -2.5);
    Sprites.create(SubImages.CARD_C6, 1, -1, -2.5);
    Sprites.create(SubImages.CARD_C6, 3.2, -0.9, -3);
    Sprites.create(SubImages.CARD_C6, -4, 1.5, -3);
    Sprites.create(SubImages.CARD_C6, 3, 1, -4);
}
