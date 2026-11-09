import { Project } from "~~/models";

export default defineEventHandler(async (event) => {
  const projectId = parseObjectId(getRouterParam(event, "id"), "project ID");

  const project = await Project.findById(projectId)
    .populate("owner", "name email")
    .populate("members", "name email");

  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project not found",
    });
  }

  return project;
});
