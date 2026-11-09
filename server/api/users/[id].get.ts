import { User } from "~~/models";

export default defineEventHandler(async (event) => {
  try {
    const userId = assertObjectId(getRouterParam(event, "id"));
    const caller = requireSelfOrAdmin(event, userId);

    const user = await User.findById(userId);

    if (!user) {
      throw createError({ statusCode: 404, statusMessage: "User not found" });
    }

    return serializeUser(user, caller);
  } catch (error) {
    throw toHttpError(error, "Failed to fetch user");
  }
});
