import { TestCase } from "~~/models";
import {
  assertJsonWithinLimits,
  errorStatusCode,
} from "~~/server/utils/jsonLimits";

export default defineEventHandler(async (event) => {
  try {
    const testCaseId = getRouterParam(event, "id");

    if (!testCaseId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Test case ID is required",
      });
    }

    const body = await readBody(event);
    const method = body._method || "GET";

    if (method === "DELETE") {
      const result = await TestCase.findByIdAndDelete(testCaseId);

      if (!result) {
        throw createError({
          statusCode: 404,
          statusMessage: "Test case not found",
        });
      }

      return { success: true, message: "Test case deleted successfully" };
    }

    if (method === "PATCH") {
      const { _method, ...updateData } = body;

      if ("original" in updateData) {
        assertJsonWithinLimits(updateData.original, "original");
      }
      if ("validated" in updateData) {
        if (!Array.isArray(updateData.validated)) {
          throw createError({
            statusCode: 400,
            statusMessage: "validated must be an array",
          });
        }
        updateData.validated.forEach((entry: { data?: unknown }, i: number) =>
          assertJsonWithinLimits(entry?.data, `validated[${i}].data`),
        );
      }

      const updatedTestCase = await TestCase.findByIdAndUpdate(
        testCaseId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true },
      )
        .populate("assigned.project", "name")
        .populate("assigned.user", "name email");

      if (!updatedTestCase) {
        throw createError({
          statusCode: 404,
          statusMessage: "Test case not found",
        });
      }

      return updatedTestCase;
    }

    // Default GET behavior
    const testCase = await TestCase.findById(testCaseId)
      .populate("assigned.project", "name")
      .populate("assigned.user", "name email");

    if (!testCase) {
      throw createError({
        statusCode: 404,
        statusMessage: "Test case not found",
      });
    }

    return testCase;
  } catch (error: any) {
    throw createError({
      statusCode: errorStatusCode(error),
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
