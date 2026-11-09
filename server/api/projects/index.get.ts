import { Project } from "~~/models";

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);

  try {
    const filter = isAdmin(user)
      ? {}
      : { $or: [{ owner: user._id }, { members: user._id }] };

    const projects = await Project.find(filter)
      .populate("owner", "name")
      .populate("members", "name");
    return projects;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch projects",
      data: error,
    });
  }
});
