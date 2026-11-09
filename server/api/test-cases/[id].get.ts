export default defineEventHandler(async (event) => {
  try {
    const { testCase } = await authorizeTestCase(event, "read");

    await testCase.populate("assigned.project", "name");
    await testCase.populate("assigned.user", "name email");

    return testCase;
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
