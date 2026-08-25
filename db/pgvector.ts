import { customType } from "drizzle-orm/pg-core";

export const CHUNK_EMBEDDING_DIMENSIONS = 1536;
export const CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS = 1024;

function createPgVectorType(dimensions: number) {
  return customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dimensions})`;
    },
    toDriver(value: number[]): string {
      return JSON.stringify(value);
    },
    fromDriver(value: string | number[]): number[] {
      if (Array.isArray(value)) {
        return value;
      }

      return JSON.parse(value) as number[];
    },
  });
}

export const pgVector1536 = createPgVectorType(CHUNK_EMBEDDING_DIMENSIONS);
export const pgVector1024 = createPgVectorType(
  CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS,
);

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export { tsvector };
