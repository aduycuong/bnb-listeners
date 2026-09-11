export const JOB_RUN_TYPE_FACEBOOK_POSTS = "facebook-posts";
export const JOB_RUN_TYPE_FACEBOOK_POST = "facebook-post";
export const JOB_RUN_TYPE_FACEBOOK_COMMENTS = "facebook-comments";
export const JOB_RUN_TYPE_SCRAPE_WEBSITE = "scrape-website";

export const JOB_RUN_TYPE_VALUES = [
  JOB_RUN_TYPE_FACEBOOK_POSTS,
  JOB_RUN_TYPE_FACEBOOK_POST,
  JOB_RUN_TYPE_FACEBOOK_COMMENTS,
  JOB_RUN_TYPE_SCRAPE_WEBSITE,
] as const;

export type JobRunType = (typeof JOB_RUN_TYPE_VALUES)[number];

export function isJobRunType(value: string): value is JobRunType {
  return JOB_RUN_TYPE_VALUES.includes(value as JobRunType);
}
