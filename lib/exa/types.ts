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

/** Default number of image links Exa should extract per result. */
export const exaDefaultImageLinks = 5;

export type ExaResultExtras = {
  links?: string[];
  imageLinks?: string[];
};

export type ExaSearchResultItem = {
  id?: string;
  url?: string;
  title?: string;
  author?: string | null;
  publishedDate?: string | null;
  text?: string;
  image?: string;
  favicon?: string;
  extras?: ExaResultExtras;
};

export type ExaSearchParams = {
  query: string;
  numResults?: number;
  excludeDomains?: string[];
};

export type ExaSearchResult = {
  results: ExaSearchResultItem[];
};
