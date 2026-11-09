import { Types } from "mongoose";
import { Project } from "~~/models";

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const body = await readBody(event);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid request body",
    });
  }

  const owner =
    body.owner === undefined
      ? new Types.ObjectId(String(user._id))
      : await parseUserId(body.owner, "owner");

  if (!isAdmin(user) && !owner.equals(user._id)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only admins can create projects for another owner",
    });
  }

  try {
    const project = new Project({
      name: parseOptionalString(body.name, "name"),
      description: parseOptionalString(body.description, "description"),
      owner,
      members:
        body.members === undefined
          ? []
          : await parseUserIds(body.members, "members"),
    });

    await project.save();

    // Populate the owner and members before returning
    await project.populate("owner", "name email");
    await project.populate("members", "name email");

    return project;
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create project",
      data: error,
    });
  }
});
