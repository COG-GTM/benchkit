import { Project } from "~~/models";

export default defineEventHandler(async (event) => {
  const { project } = await requireProjectOwner(event);

  const { deletedCount } = await Project.deleteOne({
    _id: project._id,
    owner: project.owner,
  });

  if (!deletedCount) {
    throw createError({
      statusCode: 409,
      statusMessage: "Project was changed or deleted, please retry",
    });
  }

  return { success: true, message: "Project deleted successfully" };
});
