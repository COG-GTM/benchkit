import { User } from "~~/models";

const SELF_EDITABLE_FIELDS = ["name"];
const ADMIN_EDITABLE_FIELDS = ["name", "email", "role", "azureId"];

export default defineEventHandler(async (event) => {
  try {
    const userId = assertObjectId(getRouterParam(event, "id"));
    const caller = requireSelfOrAdmin(event, userId);
    const body = await readJsonObject(event);

    if (!isAdmin(caller)) {
      const current = await User.findById(userId);
      if (!current) {
        throw createError({ statusCode: 404, statusMessage: "User not found" });
      }
      // The edit form echoes every field back, so only reject actual changes.
      const restricted = ADMIN_EDITABLE_FIELDS.filter((field) => {
        const value = body[field];
        if (SELF_EDITABLE_FIELDS.includes(field) || value === undefined) {
          return false;
        }
        // Non-admins never receive azureId, so the form sends it back empty.
        if (field === "azureId" && !value) {
          return false;
        }
        return value !== current.get(field);
      });
      if (restricted.length) {
        throw createError({
          statusCode: 403,
          statusMessage: `Only admins can change: ${restricted.join(", ")}`,
        });
      }
    }

    const allowedFields = isAdmin(caller)
      ? ADMIN_EDITABLE_FIELDS
      : SELF_EDITABLE_FIELDS;

    const $set: Record<string, string> = {};
    const $unset: Record<string, 1> = {};

    for (const field of allowedFields) {
      const value = body[field];
      if (value === undefined) {
        continue;
      }
      if (value !== null && typeof value !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: `${field} must be a string`,
        });
      }

      // An emptied azureId is removed, not stored as "", so the sparse unique
      // index keeps ignoring users without an Azure identity.
      if (field === "azureId" && !(value ?? "").trim()) {
        $unset.azureId = 1;
        continue;
      }

      $set[field] = value ?? "";
    }

    if (!Object.keys($set).length && !Object.keys($unset).length) {
      throw createError({
        statusCode: 400,
        statusMessage: "No updatable fields provided",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      Object.keys($unset).length ? { $set, $unset } : { $set },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      throw createError({ statusCode: 404, statusMessage: "User not found" });
    }

    return serializeUser(updatedUser, caller);
  } catch (error) {
    throw toHttpError(error, "Failed to update user");
  }
});
