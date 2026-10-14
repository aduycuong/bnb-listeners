/** Slug for a custom aspect, unique among `taken` (e.g. `Phí gửi xe` → `phi_gui_xe`). */
export function toAspectKey(name: string, taken: Set<string>): string {
  const base =
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50) || "aspect";

  let key = base;
  for (let index = 2; taken.has(key); index += 1) {
    key = `${base}_${index}`;
  }

  return key;
}
