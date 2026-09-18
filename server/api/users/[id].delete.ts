import { User } from "~~/models";

export default defineEventHandler(async (event) => {
  try {
    const userId = getRouterParam(event, "id");

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: "User ID is required",
      });
    }

    const caller = requireAuth(event);

    if (!isAdmin(caller)) {
      throw createError({
        statusCode: 403,
        statusMessage: "Forbidden",
      });
    }

    const result = await User.findByIdAndDelete(userId);

    if (!result) {
      throw createError({
        statusCode: 404,
        statusMessage: "User not found",
      });
    }

    return { success: true, message: "User deleted successfully" };
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
