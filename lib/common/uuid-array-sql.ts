import { sql, type SQL } from "drizzle-orm";

/** A Postgres uuid[] literal, for `= any(...)` with many ids in one parameter. */
export function uuidArraySql(ids: string[]): SQL {
  return sql`${`{${ids.join(",")}}`}::uuid[]`;
}
