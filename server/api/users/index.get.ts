import { User } from "~~/models";

export default defineEventHandler(async (event) => {
  try {
    const caller = requireAuth(event);

    // Non-admins only get the directory fields needed to render assignments.
    return isAdmin(caller)
      ? await User.find()
      : await User.find().select("name role");
  } catch (error) {
    throw toHttpError(error, "Failed to fetch users");
  }
});
