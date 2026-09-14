import { isValidObjectId } from "mongoose";
import { Project } from "~~/models";

export default defineEventHandler(async (event) => {
  try {
    const projectId = getRouterParam(event, "id");

    if (!projectId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Project ID is required",
      });
    }

    const body = await readBody(event);
    const method = body._method || "GET";

    if (method === "DELETE") {
      const result = await Project.findByIdAndDelete(projectId);

      if (!result) {
        throw createError({
          statusCode: 404,
          statusMessage: "Project not found",
        });
      }

      return { success: true, message: "Project deleted successfully" };
    }

    if (method === "PATCH") {
      const update: { name?: string; description?: string; members?: string[] } =
        {};

      if (body.name !== undefined) {
        if (typeof body.name !== "string" || !body.name.trim()) {
          throw createError({
            statusCode: 400,
            statusMessage: "name must be a non-empty string",
          });
        }
        update.name = body.name;
      }

      if (body.description !== undefined) {
        if (typeof body.description !== "string") {
          throw createError({
            statusCode: 400,
            statusMessage: "description must be a string",
          });
        }
        update.description = body.description;
      }

      if (body.members !== undefined) {
        if (
          !Array.isArray(body.members) ||
          !body.members.every(
            (m: unknown) => typeof m === "string" && isValidObjectId(m),
          )
        ) {
          throw createError({
            statusCode: 400,
            statusMessage: "members must be an array of user IDs",
          });
        }
        update.members = body.members;
      }

      const updatedProject = await Project.findByIdAndUpdate(
        projectId,
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
    }

    // Default GET behavior
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
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
