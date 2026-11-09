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

  // Match the owner that was authorised so a concurrent transfer wins.
  const updatedProject = await Project.findOneAndUpdate(
    { _id: project._id, owner: project.owner },
    { $set: update },
    { new: true, runValidators: true },
  )
    .populate("owner", "name email")
    .populate("members", "name email");

  if (!updatedProject) {
    throw createError({
      statusCode: 409,
      statusMessage: "Project was changed or deleted, please retry",
    });
  }

  return updatedProject;
});
