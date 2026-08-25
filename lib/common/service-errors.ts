export type ServiceErrorCode =
  | "NOT_FOUND"
  | "DUPLICATE"
  | "CREATE_FAILED"
  | "UPDATE_FAILED"
  | "DELETE_FAILED"
  | "UNKNOWN";

export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export class NotFoundError extends ServiceError {
  constructor(
    public readonly entity: string,
    public readonly id: string,
  ) {
    super("NOT_FOUND", `${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

export class DuplicateError extends ServiceError {
  constructor(
    public readonly entity: string,
    public readonly existingId: string,
    detail?: string,
  ) {
    const suffix = detail ? ` ${detail}` : "";
    super("DUPLICATE", `${entity} already exists (${existingId})${suffix}`);
    this.name = "DuplicateError";
  }
}

export class CreateFailedError extends ServiceError {
  constructor(public readonly entity: string) {
    super("CREATE_FAILED", `Failed to create ${entity}`);
    this.name = "CreateFailedError";
  }
}

export class UpdateFailedError extends ServiceError {
  constructor(public readonly entity: string) {
    super("UPDATE_FAILED", `Failed to update ${entity}`);
    this.name = "UpdateFailedError";
  }
}

export class DeleteFailedError extends ServiceError {
  constructor(public readonly entity: string) {
    super("DELETE_FAILED", `Failed to delete ${entity}`);
    this.name = "DeleteFailedError";
  }
}

export class UnknownServiceError extends ServiceError {
  constructor(message: string) {
    super("UNKNOWN", message);
    this.name = "UnknownServiceError";
  }
}
