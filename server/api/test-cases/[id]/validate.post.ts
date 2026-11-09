import { TestCase } from "~~/models";
import {
  assertJsonWithinLimits,
  errorStatusCode,
} from "~~/server/utils/jsonLimits";

export default defineEventHandler(async (event) => {
  try {
    const testCaseId = getRouterParam(event, "id");
    const body = await readBody(event);
    assertJsonWithinLimits(body?.data, "data");

    const testCase = await TestCase.findById(testCaseId);

    if (!testCase) {
      throw createError({
        statusCode: 404,
        statusMessage: "Test case not found",
      });
    }

    // Add validation to the test case
    testCase.validated.push({
      timestamp: new Date(),
      user: body.user,
      comment: body.comment,
      data: body.data,
    });

    await testCase.save();

    // Populate related data before returning
    await testCase.populate("assigned.user", "name email");
    await testCase.populate("assigned.project", "name");
    await testCase.populate("validated.user", "name email");

    return testCase;
  } catch (error: any) {
    throw createError({
      statusCode: errorStatusCode(error),
      statusMessage: error.statusMessage || "Failed to validate test case",
      data: error,
    });
  }
});
