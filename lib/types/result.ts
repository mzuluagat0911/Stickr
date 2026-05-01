export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

export function fail(message: string): ActionResult<never> {
  return { ok: false, message };
}

export function ok<T = unknown>(data?: T): ActionResult<T> {
  if (data === undefined) {
    return { ok: true };
  }
  return { ok: true, data };
}
