import { MAX_ELEMENTS } from './BaseBuffer.js';

export const POS_ELEMENTS = 4;
export const POS_X_OFFSET = 0;
export const POS_Y_OFFSET = 1;
export const POS_Z_OFFSET = 2;

export const POS_BUFFER_SIZE = Float32Array.BYTES_PER_ELEMENT * POS_ELEMENTS * MAX_ELEMENTS;
