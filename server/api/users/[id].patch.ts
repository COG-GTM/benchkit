import { User } from "~~/models";

const SELF_EDITABLE_FIELDS = ["name"] as const;
const ADMIN_EDITABLE_FIELDS = ["name", "email", "role", "azureId"] as const;

export default defineEventHandler(async (event) => {
  try {
    const userId = getRouterParam(event, "id");

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: "User ID is required",
      });
    }

    const caller = requireSelfOrAdmin(event, userId);

    const body = await readBody(event);
    const allowedFields = isAdmin(caller)
      ? ADMIN_EDITABLE_FIELDS
      : SELF_EDITABLE_FIELDS;

    const updateData: Record<string, unknown> = {};
    const unsetData: Record<string, 1> = {};

    for (const field of allowedFields) {
      if (body[field] === undefined) {
        continue;
      }

      // An emptied azureId must be removed, not stored as "", so the sparse
      // unique index keeps ignoring users without an Azure identity.
      if (field === "azureId" && !String(body[field] ?? "").trim()) {
        unsetData.azureId = 1;
        continue;
      }

      updateData[field] = body[field];
    }

    if (
      Object.keys(updateData).length === 0 &&
      Object.keys(unsetData).length === 0
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "No updatable fields provided",
      });
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
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
