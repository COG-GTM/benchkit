import { User } from "~~/models";

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event);
    const body = await readJsonObject(event);

    for (const field of ["email", "name", "role", "azureId"]) {
      const value = body[field];
      if (value !== undefined && value !== null && typeof value !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: `${field} must be a string`,
        });
      }
    }

    const userData: Record<string, unknown> = {
      email: body.email,
      name: body.name,
      role: body.role || "user",
    };

    // Only add azureId if it's provided and not empty
    const azureId = (body.azureId as string | undefined)?.trim();
    if (azureId) {
      userData.azureId = azureId;
    }

    const user = new User(userData);

    await user.save();

    // Return user without sensitive data
    const { azureId: _azureId, ...userResponse } = user.toObject();
    return userResponse;
  } catch (error) {
    throw toHttpError(error, "Failed to create user");
  }
});
