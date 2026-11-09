import { isValidObjectId } from "mongoose";
import { Project, User } from "~~/models";

async function resolveMembers(members: unknown): Promise<string[]> {
  if (members === undefined || members === null) return [];
  if (!Array.isArray(members)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Members must be an array of user IDs",
    });
  }

  const memberIds = [...new Set(members)];
  if (!memberIds.every((id) => typeof id === "string" && isValidObjectId(id))) {
    throw createError({
      statusCode: 400,
      statusMessage: "Members must be an array of user IDs",
    });
  }

  const existing = await User.countDocuments({ _id: { $in: memberIds } });
  if (existing !== memberIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "One or more members do not exist",
    });
  }

  return memberIds as string[];
}

export default defineEventHandler(async (event) => {
  const user = requireSessionUser(event);

  // Reject form-encoded bodies so cross-site HTML forms cannot create projects.
  const contentType = getRequestHeader(event, "content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw createError({
      statusCode: 415,
      statusMessage: "Content-Type must be application/json",
    });
  }

  const body = await readBody(event);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid request body",
    });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    throw createError({
      statusCode: 400,
      statusMessage: "Project name is required",
    });
  }

  const description =
    typeof body.description === "string" ? body.description : undefined;
  const members = await resolveMembers(body.members);

  try {
    const project = new Project({
      name,
      description,
      owner: user._id,
      members,
    });

    await project.save();

    // Populate the owner and members before returning
    await project.populate("owner", "name email");
    await project.populate("members", "name email");

    return project;
  } catch (error) {
    console.error("Failed to create project:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create project",
    });
  }
});
