import { MAX_ELEMENTS } from './BaseBuffer.js';

export const COLOR_ELEMENTS = 4;
export const COLOR_RED_OFFSET = 0;
export const COLOR_GREEN_OFFSET = 1;
export const COLOR_BLUE_OFFSET = 2;
export const COLOR_ALPHA_OFFSET = 3;
export const COLOR_BUFFER_SIZE = Float32Array.BYTES_PER_ELEMENT * COLOR_ELEMENTS * MAX_ELEMENTS;
