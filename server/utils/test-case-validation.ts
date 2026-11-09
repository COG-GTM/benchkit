import type { H3Event } from "h3";
import type { Types } from "mongoose";
import type { ITestCase } from "~~/models";
import { isAdmin, type AuthenticatedUser } from "./auth";

export const MAX_VALIDATION_COMMENT_LENGTH = 2000;

const REVIEW_ROLES = new Set(["admin", "reviewer"]);

/**
 * Rejects anything but a JSON body so the endpoint cannot be driven by a
 * cross-site HTML form (which can only send form-encoded or text bodies).
 */
export function requireJsonRequest(event: H3Event): void {
  const contentType = getRequestHeader(event, "content-type") || "";
  const mediaType = contentType.split(";")[0]!.trim().toLowerCase();

  if (mediaType !== "application/json") {
    throw createError({
      statusCode: 415,
      statusMessage: "Content-Type must be application/json",
    });
  }
}

export function canValidateTestCase(
  user: AuthenticatedUser,
  testCase: Pick<ITestCase, "assigned">,
): boolean {
  if (isAdmin(user) || REVIEW_ROLES.has(user.role)) {
    return true;
  }

  const userId = user._id as unknown as Types.ObjectId;
  return (testCase.assigned || []).some(
    (assignment) => assignment.user && userId.equals(assignment.user),
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

/**
 * Validated data must keep the field structure of the test case's original
 * output: the same keys, nested objects and array lengths, with only leaf
 * values changed. Returns the path of the first mismatch, or null.
 */
export function findShapeMismatch(
  original: unknown,
  candidate: unknown,
  path = "data",
): string | null {
  if (isPlainObject(original)) {
    if (!isPlainObject(candidate)) {
      return path;
    }
    const originalKeys = Object.keys(original);
    const candidateKeys = Object.keys(candidate);
    if (candidateKeys.length !== originalKeys.length) {
      return path;
    }
    for (const key of candidateKeys) {
      if (!Object.prototype.hasOwnProperty.call(original, key)) {
        return `${path}.${key}`;
      }
      const mismatch = findShapeMismatch(
        original[key],
        candidate[key],
        `${path}.${key}`,
      );
      if (mismatch) {
        return mismatch;
      }
    }
    return null;
  }

  if (Array.isArray(original)) {
    if (!Array.isArray(candidate) || candidate.length !== original.length) {
      return path;
    }
    for (let i = 0; i < original.length; i++) {
      const mismatch = findShapeMismatch(
        original[i],
        candidate[i],
        `${path}[${i}]`,
      );
      if (mismatch) {
        return mismatch;
      }
    }
    return null;
  }

  return isPrimitive(candidate) ? null : path;
}
