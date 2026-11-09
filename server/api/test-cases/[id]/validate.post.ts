import { Types } from "mongoose";
import { TestCase } from "~~/models";

export default defineEventHandler(async (event) => {
  try {
    const user = requireAuth(event);
    requireJsonRequest(event);

    const testCaseId = getRouterParam(event, "id");

    if (!testCaseId || !Types.ObjectId.isValid(testCaseId)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid test case ID",
      });
    }

    const body = await readBody(event);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request body",
      });
    }

    const comment = body.comment ?? undefined;

    if (
      comment !== undefined &&
      (typeof comment !== "string" ||
        comment.length > MAX_VALIDATION_COMMENT_LENGTH)
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid comment",
      });
    }

    const testCase = await TestCase.findById(testCaseId);

    if (!testCase) {
      throw createError({
        statusCode: 404,
        statusMessage: "Test case not found",
      });
    }

    if (!canValidateTestCase(user, testCase)) {
      throw createError({
        statusCode: 403,
        statusMessage: "Forbidden",
      });
    }

    const mismatch = findShapeMismatch(testCase.original, body.data);

    if (mismatch) {
      throw createError({
        statusCode: 400,
        statusMessage: `Validated data does not match the test case fields (${mismatch})`,
      });
    }

    // The reviewer is always the authenticated caller; any client-supplied
    // `user` is ignored.
    testCase.validated.push({
      timestamp: new Date(),
      user: user._id as unknown as Types.ObjectId,
      comment,
      data: body.data,
    });

    await testCase.save();

    await testCase.populate("assigned.user", "name email");
    await testCase.populate("assigned.project", "name");
    await testCase.populate("validated.user", "name email");

    return testCase;
  } catch (error: any) {
    if (error?.statusCode && error.statusCode < 500) {
      throw error;
    }
    console.error("Failed to validate test case:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to validate test case",
    });
  }
});
