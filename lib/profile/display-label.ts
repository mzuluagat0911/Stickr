/** Nombre amigable para saludos (display_name o @username). */
export function profileDisplayLabel(
  displayName: string | null | undefined,
  username: string | null | undefined,
): string {
  const d = (displayName ?? "").trim();
  if (d) return d;
  const u = (username ?? "").trim();
  if (!u) return "coleccionista";
  return u.startsWith("@") ? u : `@${u}`;
}
