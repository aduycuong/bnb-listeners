/**
 * Error class for API errors to be thrown by the handler function
 * throw new APIError('ERR_INVALID_INPUT', 'Invalid input');
 */
export class APIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "APIError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
