// TRANSITION TIMING CONSTANTS (aka SPACING aka the transformation fn)
export const LINEAR = 0;
export const EASE_IN_QUAD = 1;
export const EASE_OUT_QUAD = 2;
export const EASE_IN_OUT_QUAD = 3;
export const EASE_IN_CUBIC = 4;
export const EASE_OUT_CUBIC = 5;
export const EASE_IN_OUT_CUBIC = 6;
export const EASE_IN_QUART = 7;
export const EASE_OUT_QUART = 8;
export const EASE_IN_OUT_QUART = 9;
export const EASE_IN_QUINT = 10;
export const EASE_OUT_QUINT = 11;
export const EASE_IN_OUT_QUINT = 12;

export default function map(x, minX, maxX, minY, maxY, trans) {
    const xNormalized = (x - minX) / (maxX - minX);

    const xTransformed = trans == LINEAR ? xNormalized : nonLinearTransform(xNormalized, trans);

    const xScaled = xTransformed * (maxY - minY) + minY;
    return xScaled;
}

export function nonLinearTransform(x, spacing) {
    if (spacing == EASE_IN_QUAD)
        return x * x;
    else if (spacing == EASE_IN_CUBIC)
        return x * x * x;
    else if (spacing == EASE_IN_QUART)
        return x * x * x * x;
    else if (spacing == EASE_IN_QUINT)
        return x * x * x * x * x;

    else if (spacing == EASE_OUT_QUAD) {
        const xInv = 1 - x;
        return 1 - xInv * xInv;
    } else if (spacing == EASE_OUT_CUBIC) {
        const xInv = 1 - x;
        return 1 - xInv * xInv * xInv;
    } else if (spacing == EASE_OUT_QUART) {
        const xInv = 1 - x;
        return 1 - xInv * xInv * xInv * xInv;
    } else if (spacing == EASE_OUT_QUINT) {
        const xInv = 1 - x;
        return 1 - xInv * xInv * xInv * xInv * xInv;
    } else if (spacing == EASE_IN_OUT_QUAD) {
        const x2 = x * x;
        const xInv = 1 - x;
        const xInv2Inv = 1 - xInv * xInv;
        const xMixed = x2 * xInv + xInv2Inv * x;
        return xMixed;
    } else if (spacing == EASE_IN_OUT_CUBIC) {
        const x3 = x * x * x;
        const xInv = 1 - x;
        const xInv3Inv = 1 - xInv * xInv * xInv;
        const xMixed = x3 * xInv + xInv3Inv * x;
        return xMixed;
    } else if (spacing == EASE_IN_OUT_QUART) {
        const x4 = x * x * x * x;
        const xInv = 1 - x;
        const xInv4Inv = 1 - xInv * xInv * xInv * xInv;
        const xMixed = x4 * xInv + xInv4Inv * x;
        return xMixed;
    } else if (spacing == EASE_IN_OUT_QUINT) {
        const x5 = x * x * x * x * x;
        const xInv = 1 - x;
        const xInv5Inv = 1 - xInv * xInv * xInv * xInv * xInv;
        const xMixed = x5 * xInv + xInv5Inv * x;
        return xMixed;
    }
}
