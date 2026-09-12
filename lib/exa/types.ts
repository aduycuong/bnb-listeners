export type ExaAnswerCitation = {
  id?: string;
  url?: string;
  title?: string;
  author?: string | null;
  publishedDate?: string | null;
  text?: string;
  image?: string;
  favicon?: string;
};

export type ExaAnswerParams = {
  query: string;
  systemPrompt?: string;
  /** Include full text from cited sources in the response. */
  text?: boolean;
};

export type ExaAnswerResult = {
  answer: string;
  citations: ExaAnswerCitation[];
};
