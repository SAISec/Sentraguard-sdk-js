/**
 * @sentraguard/sdk — TypeScript/JS client and drop-in LLM guardrail for the
 * SentraGuard backend.
 *
 * Fastest start:
 *     import { check } from "@sentraguard/sdk";
 *     if ((await check("ignore previous instructions")).blocked) refuse();
 *
 * Drop-in for an existing OpenAI app (one import change):
 *     import { OpenAI } from "@sentraguard/sdk/openai";
 */

export { VERSION } from "./version.js";
export { SentraGuard } from "./client.js";
export type { SentraGuardOptions } from "./client.js";
export {
  configure,
  getDefaultClient,
  resetDefaultClient,
  check,
  checkFile,
  checkMany,
  classify,
  guard,
  health,
  guardMessages,
  guarded,
  extractUserText,
} from "./default.js";
export type { GuardMessagesOptions } from "./default.js";

export {
  CheckResult,
  BanTopicResult,
  allowlistEntryFromDict,
  allowlistSettingsFromDict,
  healthStatusFromDict,
  setupSessionFromDict,
} from "./models.js";
export type {
  AllowlistEntry,
  AllowlistSettings,
  RegistryEntry,
  HealthStatus,
  SetupSession,
} from "./models.js";

export type { ClientConfig, ResolveOptions, OnError } from "./config.js";
export { resolveConfig, saveCredentials, credentialsPath, generateDeviceId } from "./config.js";

export {
  SentraGuardError,
  ConfigurationError,
  TransportError,
  APIError,
  BadRequestError,
  AuthError,
  PermissionError,
  NotFoundError,
  PayloadTooLargeError,
  UnsupportedMediaError,
  RateLimitError,
  ServerError,
  ServiceUnavailableError,
  Blocked,
} from "./errors.js";
