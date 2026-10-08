/**
 * Pure gameplay rules barrel — everything here is (state, input) => newState.
 * No three.js, no React, no store imports. The Engine commits results
 * into the store; the HUD may read helpers but never writes.
 */

export * from './needs';
export * from './economy';
export * from './jobs';
export * from './housing';
