import { createContext } from 'react';

/**
 * In a v1.1 direction, a picked part keeps its role colour and gets a heavy outline: repainting it
 * yellow would hide the family it belongs to.
 */
export const PickedPart = createContext(false);
