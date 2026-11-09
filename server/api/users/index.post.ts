import { User } from "~~/models";

const ROLES = ["admin", "user", "reviewer"];

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event);

    const body = await readBody(event);

    const role = body?.role || "user";
    if (!ROLES.includes(role)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid role" });
    }

    if (body?.azureId != null && typeof body.azureId !== "string") {
      throw createError({ statusCode: 400, statusMessage: "Invalid azureId" });
    }

    const userData: any = {
      email: body?.email,
      name: body?.name,
      role,
    };

    // Only add azureId if it's provided and not empty
    if (body?.azureId && body.azureId.trim() !== "") {
      userData.azureId = body.azureId.trim();
    }

    const user = new User(userData);

    await user.save();

    // Return user without sensitive data
    const { azureId, ...userResponse } = user.toObject();
    return userResponse;
  } catch (error: any) {
    if (error.code === 11000) {
      throw createError({
        statusCode: 400,
        statusMessage: "User already exists",
      });
    }
    if (error.name === "ValidationError") {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid user data",
      });
    }
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Failed to create user",
    });
  }
});
