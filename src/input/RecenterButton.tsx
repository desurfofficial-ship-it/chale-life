/**
 * Recenter button (top-right). Bumps the store's recenter token; the camera
 * rig polls it each frame, snaps back onto the player and resumes following.
 * Panning (drag / pinch-pan) suspends follow — this button is how you get it
 * back. No DOM lookups, no window globals.
 */

import { requestRecenter } from '../store/gameStore';

export function RecenterButton() {
  return (
    <button
      type="button"
      className="recenter-btn"
      onClick={() => requestRecenter()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      Recenter
    </button>
  );
}
