import { TestCase } from "~~/models";

export default defineEventHandler(async (event) => {
  try {
    const { testCase } = await authorizeTestCase(event, "delete");

    const deleted = await TestCase.findByIdAndDelete(testCase._id);

    if (!deleted) {
      throw createError({
        statusCode: 404,
        statusMessage: "Test case not found",
      });
    }

    return { success: true, message: "Test case deleted successfully" };
  } catch (error) {
    const { statusCode, statusMessage } = error as {
      statusCode?: number;
      statusMessage?: string;
    };
    throw createError({
      statusCode: statusCode || 500,
      statusMessage: statusMessage || "Internal server error",
    });
  }
});
