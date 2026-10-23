/** Rule channels override the project list. Only `email` is delivered. */
export function wantsAlertEmail(
  ruleChannels: string[] | null | undefined,
  projectChannels: string[] | undefined,
) {
  const channels = ruleChannels ?? projectChannels ?? ["email"];
  return channels.includes("email");
}

export function alertRecipients(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.includes("@"));
}
