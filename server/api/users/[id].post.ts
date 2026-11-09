import { User } from "~~/models";

const EDITABLE_FIELDS = ["name", "email", "role", "azureId"] as const;

export default defineEventHandler(async (event) => {
  try {
    const userId = getRouterParam(event, "id");

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: "User ID is required",
      });
    }

    const body = await readBody(event);
    const method = body._method || "GET";

    if (method === "DELETE" || method === "PATCH") {
      requireAdmin(event);
    }

    if (method === "DELETE") {
      const result = await User.findByIdAndDelete(userId);

      if (!result) {
        throw createError({
          statusCode: 404,
          statusMessage: "User not found",
        });
      }

      return { success: true, message: "User deleted successfully" };
    }

    if (method === "PATCH") {
      const updateData: Record<string, unknown> = {};
      const unsetData: Record<string, 1> = {};

      for (const field of EDITABLE_FIELDS) {
        if (body[field] === undefined) continue;

        // An emptied azureId is removed rather than stored as "" so the
        // sparse unique index keeps ignoring users without an Azure identity.
        if (field === "azureId" && !String(body[field] ?? "").trim()) {
          unsetData.azureId = 1;
          continue;
        }

        updateData[field] =
          field === "azureId" ? String(body[field]).trim() : body[field];
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: { ...updateData, updatedAt: new Date() },
          ...(Object.keys(unsetData).length ? { $unset: unsetData } : {}),
        },
        { new: true, runValidators: true },
      );

      if (!updatedUser) {
        throw createError({
          statusCode: 404,
          statusMessage: "User not found",
        });
      }

      return updatedUser;
    }

    // Default GET behavior
    const user = await User.findById(userId);

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: "User not found",
      });
    }

    return user;
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
