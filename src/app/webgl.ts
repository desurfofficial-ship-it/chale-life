/**
 * Boot-time WebGL capability check — renders a friendly fallback message when
 * the browser can't provide a context. This is capability detection at startup,
 * not gameplay DOM access.
 */

export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
