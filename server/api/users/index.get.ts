import { User } from "~~/models";

export default defineEventHandler(async (event) => {
  try {
    const caller = requireAuth(event);

    if (isAdmin(caller)) {
      return await User.find();
    }

    // Non-admins only get the directory fields needed to render assignments,
    // plus their own record so the edit form can show their email.
    const users = await User.find().select("name role");
    return users.map((user) =>
      user._id.equals(caller._id) ? serializeUser(caller, caller) : user,
    );
  } catch (error) {
    throw toHttpError(error, "Failed to fetch users");
  }
});
