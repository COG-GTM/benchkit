import { User } from "~~/models";

export default defineEventHandler(async (event) => {
  try {
    requireAuth(event);

    const users = await User.find();
    return users;
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Failed to fetch users",
    });
  }
});
