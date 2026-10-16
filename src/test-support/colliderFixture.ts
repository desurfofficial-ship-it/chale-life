/**
 * colliderFixture.ts — node-test support for the P2-2 fetch-based capture.
 *
 * colliders.json now lives in public/data/ and the app fetches it at boot;
 * node tests have no fetch/base URL, so tests that need the real captured
 * set call loadColliderFixture() (ideally before module-scope constants
 * read `colliders`) to ingest the same file from disk.
 */
import { readFileSync } from 'node:fs';

import { applyColliderCapture, type RawBox } from '../world/colliders';

let loaded = false;

export function loadColliderFixture(): void {
  if (loaded) return;
  const raw = JSON.parse(
    readFileSync(new URL('../../public/data/colliders.json', import.meta.url), 'utf8'),
  ) as { boxes: RawBox[] };
  applyColliderCapture(raw);
  loaded = true;
}
