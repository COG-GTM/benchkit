import { User } from "~~/models";

export default defineEventHandler(async (event) => {
  try {
    const caller = requireAuth(event);

    // Non-admins only get the directory fields needed to render assignments.
    const users = isAdmin(caller)
      ? await User.find()
      : await User.find().select("name role");

    return users;
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Failed to fetch users",
    });
  }
});
