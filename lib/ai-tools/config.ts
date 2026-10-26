/** Settings of the AI tools (docs/decisions.md D27). */
export const AI_TOOLS_CONFIG = {
  /** Period used when a tool call gives none: the dashboard default. */
  defaultPeriod: { type: "rolling", days: 14 },
  /** Characters of a mention's text, and of its root post, sent back by `search_mentions`. */
  mentionTextLength: 600,
  rootTextLength: 200,
  /** Sources returned by `list_sources`, at most. */
  maxSources: 100,
  /** Sample mentions per entity in a match preview, and their length. */
  previewSamples: 2,
  previewSampleLength: 200,
  serverName: "bnb-listening",
  serverVersion: "1.0.0",
} as const;

/** What each case of `create_project` is for, read by the model. */
export const CASE_DESCRIPTIONS = {
  project:
    "Theo dõi dự án: một dự án bất động sản (primary) so với các dự án cạnh tranh; giá rao, " +
    "câu hỏi người mua, cảm xúc theo khía cạnh.",
  market:
    "Tâm lý thị trường khu vực: một hay nhiều khu vực (area); giá, thanh khoản, hạ tầng, lãi suất.",
  brand:
    "Uy tín chủ đầu tư: một chủ đầu tư (primary), các dự án của họ (product) và chủ đầu tư so " +
    "sánh (competitor); chỉ số uy tín, Share of Voice.",
} as const;
