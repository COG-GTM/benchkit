import { Types } from "mongoose";

export const TEST_CASE_EDITABLE_FIELDS = [
  "inputs",
  "original",
  "assigned",
] as const;

const INPUT_TYPES = ["pdf", "img", "txt", "json"] as const;
const MAX_LIST_LENGTH = 100;
const MAX_STRING_LENGTH = 1024;
const MAX_ORIGINAL_DEPTH = 32;

export interface TestCaseInputUpdate {
  type: (typeof INPUT_TYPES)[number];
  file: string;
  filename: string;
}

export interface TestCaseAssignedUpdate {
  project: Types.ObjectId;
  user?: Types.ObjectId;
}

export interface TestCaseUpdate {
  inputs?: TestCaseInputUpdate[];
  original?: Record<string, unknown> | unknown[];
  assigned?: TestCaseAssignedUpdate[];
}

export class TestCaseUpdateError extends Error {
  readonly statusCode = 400;

  constructor(readonly statusMessage: string) {
    super(statusMessage);
  }
}

function badRequest(statusMessage: string): never {
  throw new TestCaseUpdateError(statusMessage);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  context: string,
) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      badRequest(`Field "${key}" is not allowed in ${context}`);
    }
  }
}

function boundedString(value: unknown, context: string): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > MAX_STRING_LENGTH ||
    value.includes("\0")
  ) {
    badRequest(`${context} must be a non-empty string`);
  }
  return value;
}

function objectId(value: unknown, context: string): Types.ObjectId {
  if (typeof value !== "string" || !Types.ObjectId.isValid(value)) {
    badRequest(`${context} must be a valid ID`);
  }
  return new Types.ObjectId(value);
}

function list(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_LENGTH) {
    badRequest(`${context} must be an array of at most ${MAX_LIST_LENGTH}`);
  }
  return value;
}

function parseInputs(value: unknown): TestCaseInputUpdate[] {
  return list(value, "inputs").map((item, i) => {
    const context = `inputs[${i}]`;
    if (!isPlainObject(item)) {
      badRequest(`${context} must be an object`);
    }
    assertOnlyKeys(item, ["type", "file", "filename"], context);

    if (!INPUT_TYPES.includes(item.type as TestCaseInputUpdate["type"])) {
      badRequest(`${context}.type must be one of ${INPUT_TYPES.join(", ")}`);
    }

    const file = boundedString(item.file, `${context}.file`);
    if (file.split(/[\\/]/).includes("..")) {
      badRequest(`${context}.file must not contain ".." segments`);
    }

    return {
      type: item.type as TestCaseInputUpdate["type"],
      file,
      filename: boundedString(item.filename, `${context}.filename`),
    };
  });
}

function assertSafeKeys(value: unknown, path: string, depth: number) {
  if (depth > MAX_ORIGINAL_DEPTH) {
    badRequest(`${path} is nested too deeply`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) =>
      assertSafeKeys(item, `${path}[${i}]`, depth + 1),
    );
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith("$")) {
        badRequest(`${path} must not contain "$"-prefixed keys`);
      }
      assertSafeKeys(child, `${path}.${key}`, depth + 1);
    }
  }
}

function parseOriginal(value: unknown): Record<string, unknown> | unknown[] {
  if (!isPlainObject(value) && !Array.isArray(value)) {
    badRequest("original must be a JSON object or array");
  }
  assertSafeKeys(value, "original", 0);
  return value;
}

function parseAssigned(value: unknown): TestCaseAssignedUpdate[] {
  return list(value, "assigned").map((item, i) => {
    const context = `assigned[${i}]`;
    if (!isPlainObject(item)) {
      badRequest(`${context} must be an object`);
    }
    assertOnlyKeys(item, ["project", "user"], context);

    const assignment: TestCaseAssignedUpdate = {
      project: objectId(item.project, `${context}.project`),
    };
    if (item.user !== undefined && item.user !== null && item.user !== "") {
      assignment.user = objectId(item.user, `${context}.user`);
    }
    return assignment;
  });
}

/**
 * Builds a $set document from a PATCH body, accepting only the editable
 * test case fields. Anything else (validated history, timestamps, ids,
 * update operators) is rejected with 400 instead of being silently dropped.
 */
export function parseTestCaseUpdate(body: unknown): TestCaseUpdate {
  if (!isPlainObject(body)) {
    badRequest("Request body must be a JSON object");
  }
  assertOnlyKeys(body, TEST_CASE_EDITABLE_FIELDS, "a test case update");

  const update: TestCaseUpdate = {};
  if (body.inputs !== undefined) update.inputs = parseInputs(body.inputs);
  if (body.original !== undefined) {
    update.original = parseOriginal(body.original);
  }
  if (body.assigned !== undefined) {
    update.assigned = parseAssigned(body.assigned);
  }

  if (Object.keys(update).length === 0) {
    badRequest("No updatable fields provided");
  }
  return update;
}
