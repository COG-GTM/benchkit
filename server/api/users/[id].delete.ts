import { User } from "~~/models";

export default defineEventHandler(async (event) => {
  try {
    const userId = assertObjectId(getRouterParam(event, "id"));
    requireAdmin(event);

    const result = await User.findByIdAndDelete(userId);

    if (!result) {
      throw createError({ statusCode: 404, statusMessage: "User not found" });
    }

    return { success: true, message: "User deleted successfully" };
  } catch (error) {
    throw toHttpError(error, "Failed to delete user");
  }
});
