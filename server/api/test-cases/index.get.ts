import { TestCase } from "~~/models";

// `.lean()` skips document hydration, so reproduce what hydrated `toJSON()`
// did for data written through updates: Mongoose's `minimize` (drop empty
// objects in Mixed paths, keeping `{}` array items) and `[]` for missing arrays.
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === "object" &&
  Object.getPrototypeOf(value) === Object.prototype;

function pruneEmptyObjects(value: unknown): boolean {
  if (Array.isArray(value)) {
    value.forEach(pruneEmptyObjects);
    return false;
  }
  if (!isPlainObject(value)) return false;
  for (const key of Object.keys(value)) {
    if (pruneEmptyObjects(value[key])) Reflect.deleteProperty(value, key);
  }
  return Object.keys(value).length === 0;
}

function toHydratedShape<T extends object>(testCase: T): T {
  const doc = testCase as Record<string, unknown>;
  if (pruneEmptyObjects(doc.original)) delete doc.original;
  if (Array.isArray(doc.validated)) {
    for (const validation of doc.validated) {
      if (isPlainObject(validation) && pruneEmptyObjects(validation.data)) {
        delete validation.data;
      }
    }
  }
  for (const key of ["inputs", "assigned", "validated"]) {
    if (!(key in doc)) doc[key] = [];
  }
  return testCase;
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);

    // Build filter based on query parameters
    const filter: any = {};

    if (query.project) {
      filter["assigned.project"] = query.project;
    }

    if (query.user) {
      filter["assigned.user"] = query.user;
    }

    const testCases = await TestCase.find(filter)
      .populate("assigned.user", "name email")
      .populate("assigned.project", "name")
      .populate("validated.user", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return testCases.map(toHydratedShape);
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch test cases",
      data: error,
    });
  }
});
