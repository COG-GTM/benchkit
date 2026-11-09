import { User } from "~~/models";

export default defineEventHandler(async (event) => {
  const caller = await requireUser(event);

  try {
    return isAdmin(caller)
      ? await User.find()
      : await User.find({}, PUBLIC_USER_FIELDS);
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch users",
    });
  }
});
