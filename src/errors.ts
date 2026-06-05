/**
 * Exception taxonomy for the SentraGuard SDK. Every HTTP error maps to a typed
 * subclass of {@link SentraGuardError}; the backend returns errors as
 * `{ error, message, ... }` and {@link errorFromResponse} maps the status code.
 */

import type { CheckResult } from "./models.js";

export class SentraGuardError extends Error {
  statusCode?: number;
  errorType?: string;
  response?: Record<string, unknown>;

  constructor(
    message: string,
    opts: { statusCode?: number; errorType?: string; response?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = opts.statusCode;
    this.errorType = opts.errorType;
    this.response = opts.response;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfigurationError extends SentraGuardError {}
export class TransportError extends SentraGuardError {}
export class APIError extends SentraGuardError {}
export class BadRequestError extends APIError {}
export class AuthError extends APIError {}
export class PermissionError extends APIError {}
export class NotFoundError extends APIError {}
export class PayloadTooLargeError extends APIError {}
export class UnsupportedMediaError extends APIError {}
export class ServerError extends APIError {}
export class ServiceUnavailableError extends ServerError {}

export class RateLimitError extends APIError {
  retryAfter?: number;
  constructor(
    message: string,
    opts: {
      retryAfter?: number;
      statusCode?: number;
      errorType?: string;
      response?: Record<string, unknown>;
    } = {},
  ) {
    super(message, opts);
    this.retryAfter = opts.retryAfter;
  }
}

/** Raised by `guard()` / provider wrappers when content is blocked by policy. */
export class Blocked extends SentraGuardError {
  result?: CheckResult;
  constructor(message: string, result?: CheckResult) {
    super(message);
    this.result = result;
  }
}

export function errorFromResponse(
  statusCode: number,
  payload: Record<string, unknown> | undefined,
  retryAfter?: number,
): APIError {
  const body = payload ?? {};
  const errorType = typeof body.error === "string" ? body.error : undefined;
  const message =
    (typeof body.message === "string" && body.message) ||
    (typeof body.error === "string" && body.error) ||
    `HTTP ${statusCode}`;
  const base = { statusCode, errorType, response: body };

  switch (statusCode) {
    case 400:
      return new BadRequestError(message, base);
    case 401:
      return new AuthError(message, base);
    case 403:
      return new PermissionError(message, base);
    case 404:
      return new NotFoundError(message, base);
    case 413:
      return new PayloadTooLargeError(message, base);
    case 415:
      return new UnsupportedMediaError(message, base);
    case 429:
      return new RateLimitError(message, { ...base, retryAfter });
    case 503:
      return new ServiceUnavailableError(message, base);
    default:
      return statusCode >= 500
        ? new ServerError(message, base)
        : new APIError(message, base);
  }
}
