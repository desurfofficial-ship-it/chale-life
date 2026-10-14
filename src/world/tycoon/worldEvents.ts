/**
 * World → shell event bus (W-007).
 * No store imports. Engine / App subscribe and commit.
 */

export type WorldEventMap = {
  plotSelected: { plotId: string };
};

type Handler<K extends keyof WorldEventMap> = (payload: WorldEventMap[K]) => void;

const handlers: { [K in keyof WorldEventMap]?: Set<Handler<K>> } = {};

export function onWorldEvent<K extends keyof WorldEventMap>(
  type: K,
  fn: Handler<K>,
): () => void {
  let set = handlers[type] as Set<Handler<K>> | undefined;
  if (!set) {
    set = new Set();
    handlers[type] = set as Set<Handler<keyof WorldEventMap>>;
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
  };
}

export function emitWorldEvent<K extends keyof WorldEventMap>(
  type: K,
  payload: WorldEventMap[K],
): void {
  const set = handlers[type] as Set<Handler<K>> | undefined;
  if (!set) return;
  for (const fn of set) fn(payload);
}
