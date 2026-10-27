import { notInArray } from "drizzle-orm";

import { projects } from "@/db/schema";

import { COMPARE_CASES } from "../project-cases";

/**
 * Projects that listen themselves, for jobs that loop over every project (AI reports, alerts,
 * L4 refresh). Compare projects only read their members (D30).
 */
export const listeningProjectFilter = notInArray(projects.listeningCase, [...COMPARE_CASES]);
