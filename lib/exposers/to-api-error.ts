import { ServiceError } from "@/lib/common/service-errors";
import { APIError } from "./api-error";

export function toAPIError(error: unknown): APIError | null {
  if (!(error instanceof ServiceError)) {
    return null;
  }

  switch (error.code) {
    case "NOT_FOUND":
      return new APIError("ERR_NOT_FOUND", error.message, 404);
    case "DUPLICATE":
      return new APIError("ERR_DUPLICATE", error.message, 409);
    case "CREATE_FAILED":
      return new APIError("ERR_CREATE_FAILED", error.message, 500);
    case "UPDATE_FAILED":
      return new APIError("ERR_UPDATE_FAILED", error.message, 500);
    case "DELETE_FAILED":
      return new APIError("ERR_DELETE_FAILED", error.message, 500);
    case "UNKNOWN":
      return new APIError("ERR_UNKNOWN", error.message, 500);
    default:
      return new APIError("ERR_SERVICE", error.message, 400);
  }
}
