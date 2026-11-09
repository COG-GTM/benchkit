import { Project } from "~~/models";

export default defineEventHandler(async (event) => {
  const { project } = await requireProjectOwner(event);
  const body = await readBody(event);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid request body",
    });
  }

  const update: Record<string, unknown> = {};

  const name = parseOptionalString(body.name, "name");
  if (name !== undefined) update.name = name;

  const description = parseOptionalString(body.description, "description");
  if (description !== undefined) update.description = description;

  if (body.owner !== undefined) {
    update.owner = await parseUserId(body.owner, "owner");
  }

  if (body.members !== undefined) {
    update.members = await parseUserIds(body.members, "members");
  }

  const updatedProject = await Project.findByIdAndUpdate(
    project._id,
    { $set: update },
    { new: true, runValidators: true },
  )
    .populate("owner", "name email")
    .populate("members", "name email");

  if (!updatedProject) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project not found",
    });
  }

  return updatedProject;
});
