export const ANIM_COLOR1C_MAX_ELEMENTS = 1 << 13;
export const ANIM_COLOR1C_BYTES_PER_ELEMENT = 24;
export const ANIM_COLOR1C_BUFFER_SIZE = ANIM_COLOR1C_BYTES_PER_ELEMENT * ANIM_COLOR1C_MAX_ELEMENTS;

export const ANIM_COLOR1C_VERSION_N_STATE_OFFSET = 0; // 2 byte
export const ANIM_COLOR1C_TIMING_N_INFO_OFFSET = 2; // 2 byte
export const ANIM_COLOR1C_SPRITE_OFFSET = 4; // 4 byte
export const ANIM_COLOR1C_START_OFFSET = 8; // 4 byte
export const ANIM_COLOR1C_END_OFFSET = 12; // 4 byte
export const ANIM_COLOR1C_FROM_OFFSET = 16; // 4 byte
export const ANIM_COLOR1C_TO_OFFSET = 20; // 4 byte

export const ANIM_COLOR1C_INFO_BITS = 2;
// info flags
export const ANIM_COLOR1C_CALLBACK_FLAG = 0b0000000000000001;
export const ANIM_COLOR1C_LOOP_FLAG = 0b0000000000000010;

export const ANIM_COLOR1C_CB_KEY = 'anim-color1c-';


export const ANIM_POS_MAX_ELEMENTS = 1 << 13;
export const ANIM_POS_BYTES_PER_ELEMENT = 40;
export const ANIM_POS_BUFFER_SIZE = ANIM_POS_BYTES_PER_ELEMENT * ANIM_POS_MAX_ELEMENTS;

export const ANIM_POS_VERSION_N_STATE_OFFSET = 0; // 2 byte
export const ANIM_POS_TIMING_N_INFO_OFFSET = 2; // 2 byte
export const ANIM_POS_SPRITE_OFFSET = 4; // 4 byte
export const ANIM_POS_START_OFFSET = 8; // 4 byte
export const ANIM_POS_END_OFFSET = 12; // 4 byte
export const ANIM_POS_FROM_X_OFFSET = 16; // 4 byte
export const ANIM_POS_TO_X_OFFSET = 20; // 4 byte
export const ANIM_POS_FROM_Y_OFFSET = 24; // 4 byte
export const ANIM_POS_TO_Y_OFFSET = 28; // 4 byte
export const ANIM_POS_FROM_Z_OFFSET = 32; // 4 byte
export const ANIM_POS_TO_Z_OFFSET = 36; // 4 byte

export const ANIM_POS_INFO_BITS = 2;
// info flags
export const ANIM_POS_CALLBACK_FLAG = 0b0000000000000001;
export const ANIM_POS_LOOP_FLAG = 0b0000000000000010;

export const ANIM_POS_CB_KEY = 'anim-pos-';


export const ANIM_POSC_MAX_ELEMENTS = 1 << 13;
export const ANIM_POSC_BYTES_PER_ELEMENT = 64;
export const ANIM_POSC_BUFFER_SIZE = ANIM_POSC_BYTES_PER_ELEMENT * ANIM_POSC_MAX_ELEMENTS;

export const ANIM_POSC_VERSION_N_STATE_OFFSET = 0; // 2 byte
export const ANIM_POSC_TIMING_N_INFO_OFFSET = 2; // 2 byte

export const ANIM_POSC_SPRITE_OFFSET = 4; // 4 byte

export const ANIM_POSC_START_OFFSET = 8; // 4 byte
export const ANIM_POSC_END_OFFSET = 12; // 4 byte

export const ANIM_POSC_A_X_OFFSET = 16; // 4 bytes
export const ANIM_POSC_A_Y_OFFSET = 20; // 4 bytes
export const ANIM_POSC_A_Z_OFFSET = 24; // 4 bytes

export const ANIM_POSC_B_X_OFFSET = 28; // 4 bytes
export const ANIM_POSC_B_Y_OFFSET = 32; // 4 bytes
export const ANIM_POSC_B_Z_OFFSET = 36; // 4 bytes

export const ANIM_POSC_C_X_OFFSET = 40; // 4 bytes
export const ANIM_POSC_C_Y_OFFSET = 44; // 4 bytes
export const ANIM_POSC_C_Z_OFFSET = 48; // 4 bytes

export const ANIM_POSC_D_X_OFFSET = 52; // 4 bytes
export const ANIM_POSC_D_Y_OFFSET = 56; // 4 bytes
export const ANIM_POSC_D_Z_OFFSET = 60; // 4 bytes


export const ANIM_POSC_INFO_BITS = 2;
// info flags
export const ANIM_POSC_CALLBACK_FLAG = 0b0000000000000001;
export const ANIM_POSC_LOOP_FLAG = 0b0000000000000010;

export const ANIM_POSC_CB_KEY = 'anim-posc-';


export const ANIM_ROT1D_MAX_ELEMENTS = 1 << 13;
export const ANIM_ROT1D_BYTES_PER_ELEMENT = 24;
export const ANIM_ROT1D_BUFFER_SIZE = ANIM_ROT1D_BYTES_PER_ELEMENT * ANIM_ROT1D_MAX_ELEMENTS;

export const ANIM_ROT1D_VERSION_N_STATE_OFFSET = 0; // 2 byte
export const ANIM_ROT1D_TIMING_N_INFO_OFFSET = 2; // 2 byte
export const ANIM_ROT1D_SPRITE_OFFSET = 4; // 4 byte
export const ANIM_ROT1D_START_OFFSET = 8; // 4 byte
export const ANIM_ROT1D_END_OFFSET = 12; // 4 byte
export const ANIM_ROT1D_FROM_OFFSET = 16; // 4 byte
export const ANIM_ROT1D_TO_OFFSET = 20; // 4 byte

export const ANIM_ROT1D_INFO_BITS = 5;
// info flags
export const ANIM_ROT1D_CALLBACK_FLAG = 0b0000000000000001;
export const ANIM_ROT1D_LOOP_FLAG = 0b0000000000000010;
export const ANIM_ROT1D_X_FLAG = 0b0000000000000100;
export const ANIM_ROT1D_Y_FLAG = 0b0000000000001000;
export const ANIM_ROT1D_Z_FLAG = 0b0000000000010000;

export const ANIM_ROT1D_CB_KEY = 'anim-rot1d-';


export const ANIM_SCALE_MAX_ELEMENTS = 1 << 13;
export const ANIM_SCALE_BYTES_PER_ELEMENT = 24;
export const ANIM_SCALE_BUFFER_SIZE = ANIM_SCALE_BYTES_PER_ELEMENT * ANIM_SCALE_MAX_ELEMENTS;

export const ANIM_SCALE_VERSION_N_STATE_OFFSET = 0; // 2 byte
export const ANIM_SCALE_TIMING_N_INFO_OFFSET = 2; // 2 byte
export const ANIM_SCALE_SPRITE_OFFSET = 4; // 4 byte
export const ANIM_SCALE_START_OFFSET = 8; // 4 byte
export const ANIM_SCALE_END_OFFSET = 12; // 4 byte
export const ANIM_SCALE_FROM_OFFSET = 16; // 4 byte
export const ANIM_SCALE_TO_OFFSET = 20; // 4 byte

export const ANIM_SCALE_INFO_BITS = 2;
// info flags
export const ANIM_SCALE_CALLBACK_FLAG = 0b0000000000000001;
export const ANIM_SCALE_LOOP_FLAG = 0b0000000000000010;

export const ANIM_SCALE_CB_KEY = 'anim-scale-';

