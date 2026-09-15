export const SOURCE_RUN_TYPE_FACEBOOK_POSTS = "facebook-posts";
export const SOURCE_RUN_TYPE_FACEBOOK_POST = "facebook-post";
export const SOURCE_RUN_TYPE_FACEBOOK_COMMENTS = "facebook-comments";
export const SOURCE_RUN_TYPE_SCRAPE_WEBSITE = "scrape-website";

export const SOURCE_RUN_TYPE_VALUES = [
  SOURCE_RUN_TYPE_FACEBOOK_POSTS,
  SOURCE_RUN_TYPE_FACEBOOK_POST,
  SOURCE_RUN_TYPE_FACEBOOK_COMMENTS,
  SOURCE_RUN_TYPE_SCRAPE_WEBSITE,
] as const;

export type SourceRunType = (typeof SOURCE_RUN_TYPE_VALUES)[number];

export function isSourceRunType(value: string): value is SourceRunType {
  return SOURCE_RUN_TYPE_VALUES.includes(value as SourceRunType);
}
