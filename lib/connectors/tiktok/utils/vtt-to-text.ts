const BLOCK_HEADERS = /^(NOTE|STYLE|REGION)\b/;

/**
 * The spoken text of a WebVTT file: drops the header, cue ids, timings, tags
 * and a line the next cue repeats.
 */
export function vttToText(vtt: string): string {
  const raw = vtt.replace(/^﻿/, "").split(/\r?\n/);
  const lines: string[] = [];
  let skipBlock = false;

  for (let index = 0; index < raw.length; index++) {
    const line = raw[index].replace(/<[^>]+>/g, "").trim();
    if (!line) {
      skipBlock = false;
      continue;
    }
    if (skipBlock || line.startsWith("WEBVTT") || line.includes("-->")) continue;
    if (BLOCK_HEADERS.test(line)) {
      skipBlock = true;
      continue;
    }
    // A cue id is the line right before the timing.
    if (raw[index + 1]?.includes("-->")) continue;
    if (lines.at(-1) !== line) lines.push(line);
  }

  return lines.join(" ").replace(/\s+/g, " ").trim();
}
