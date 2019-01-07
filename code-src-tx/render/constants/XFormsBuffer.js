import { MAX_ELEMENTS } from './BaseBuffer.js';

export const XFORMS_ELEMENTS = 4;
export const XFORMS_ROTATION_X_OFFSET = 0;
export const XFORMS_ROTATION_Y_OFFSET = 1;
export const XFORMS_ROTATION_Z_OFFSET = 2;
export const XFORMS_SCALE_OFFSET = 3;
export const XFORMS_BUFFER_SIZE = Float32Array.BYTES_PER_ELEMENT * XFORMS_ELEMENTS * MAX_ELEMENTS;
