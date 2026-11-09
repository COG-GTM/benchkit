import {
  checkJsonLimits,
  describeJsonLimitViolation,
} from "~~/shared/jsonLimits";

export function assertJsonWithinLimits(value: unknown, field: string) {
  const violation = checkJsonLimits(value);
  if (violation) {
    throw createError({
      statusCode: 400,
      statusMessage: describeJsonLimitViolation(field, violation),
    });
  }
}

export function errorStatusCode(error: unknown): number {
  const { statusCode, name } = (error ?? {}) as {
    statusCode?: number;
    name?: string;
  };
  if (statusCode) return statusCode;
  if (name === "ValidationError" || name === "CastError") {
    return 400;
  }
  return 500;
}
