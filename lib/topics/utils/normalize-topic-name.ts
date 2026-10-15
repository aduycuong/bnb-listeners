/** Key under which two topic names count as the same: case, spacing and Unicode form ignored. */
export function normalizeTopicName(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}
