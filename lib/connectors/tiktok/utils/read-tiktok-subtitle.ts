export type TiktokSubtitleRef = {
  /** Signed TikTok CDN link; it expires about 30 days after the fetch. */
  url: string;
  language: string | null;
  source: "asr" | "creator";
};

type Row = Record<string, unknown>;

function asRow(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const row = asRow(entry);
        return row ? [row] : [];
      })
    : [];
}

/**
 * The subtitles of a raw TikHub video, translations left out. The App payload
 * (search) lists them in `video.cla_info.caption_infos`, the Web payload
 * (channel scan) in `video.subtitleInfos` with `Source` ASR or MT.
 */
function listSubtitles(record: Row): TiktokSubtitleRef[] {
  const video = asRow(record.video);
  const subtitles: TiktokSubtitleRef[] = [];

  for (const info of asRows(asRow(video?.cla_info)?.caption_infos)) {
    const url =
      readString(info.url) ?? (Array.isArray(info.url_list) ? readString(info.url_list[0]) : null);
    if (!url || info.is_original_caption === false) continue;
    subtitles.push({
      url,
      language: readString(info.language_code),
      source: info.is_auto_generated === false ? "creator" : "asr",
    });
  }

  for (const info of asRows(video?.subtitleInfos)) {
    const url = readString(info.Url);
    const source = readString(info.Source);
    if (!url || source === "MT") continue;
    subtitles.push({
      url,
      language: readString(info.LanguageCodeName),
      source: source === "ASR" ? "asr" : "creator",
    });
  }

  return subtitles;
}

/** The video's subtitle in its spoken language, Vietnamese first; null when it has none. */
export function readTiktokSubtitle(record: unknown): TiktokSubtitleRef | null {
  const row = asRow(record);
  if (!row) return null;
  const subtitles = listSubtitles(row);
  return (
    subtitles.find((subtitle) => subtitle.language?.toLowerCase().startsWith("vi")) ??
    subtitles[0] ??
    null
  );
}
