import { Types } from "mongoose";
import { TestCase } from "~~/models";

const DEFAULT_TEST_CASE_LIMIT = 100;
const MAX_TEST_CASE_LIMIT = 500;

function parseObjectIdParam(value: unknown, name: string) {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || !Types.ObjectId.isValid(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${name} ID`,
    });
  }

  return new Types.ObjectId(value);
}

function parsePositiveInt(value: unknown, name: string, fallback: number) {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = typeof value === "string" ? Number(value) : NaN;

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${name}`,
    });
  }

  return parsed;
}

export default defineEventHandler(async (event) => {
  try {
    const caller = requireAuth(event);
    const query = getQuery(event);

    const projectId = parseObjectIdParam(query.project, "project");
    const userId = parseObjectIdParam(query.user, "user");
    const limit = Math.min(
      parsePositiveInt(query.limit, "limit", DEFAULT_TEST_CASE_LIMIT),
      MAX_TEST_CASE_LIMIT,
    );
    const page = parsePositiveInt(query.page, "page", 1);

    const accessibleProjectIds = await getAccessibleProjectIds(caller);
    const filter: Record<string, unknown> = {};

    if (projectId) {
      if (
        accessibleProjectIds &&
        !accessibleProjectIds.some((id) => id.equals(projectId))
      ) {
        throw createError({
          statusCode: 403,
          statusMessage: "Forbidden",
        });
      }
      filter["assigned.project"] = projectId;
    } else if (accessibleProjectIds) {
      filter["assigned.project"] = { $in: accessibleProjectIds };
    }

    if (userId) {
      filter["assigned.user"] = userId;
    }

    const [total, testCases] = await Promise.all([
      TestCase.countDocuments(filter),
      TestCase.find(filter)
        .select("inputs original assigned validated createdAt updatedAt")
        .populate("assigned.user", "name")
        .populate("assigned.project", "name")
        .populate("validated.user", "name")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    setResponseHeaders(event, {
      "X-Total-Count": String(total),
      "X-Page": String(page),
      "X-Limit": String(limit),
    });

    return testCases;
  } catch (error: unknown) {
    if (isError(error) && error.statusCode < 500) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.statusMessage,
      });
    }

    console.error("Failed to fetch test cases:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch test cases",
    });
  }
});
