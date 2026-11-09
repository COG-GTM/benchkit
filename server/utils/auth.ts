import type { H3Event } from "h3";
import type { HydratedDocument } from "mongoose";
import { User, type IUser } from "~~/models";

export type AuthenticatedUser = HydratedDocument<IUser>;

declare module "h3" {
  interface H3EventContext {
    auth?: AuthenticatedUser | null;
  }
}

/**
 * Resolves the caller from the identity headers injected by the Azure
 * App Service / Entra ID authentication layer (Easy Auth) in front of the app.
 * These headers are only trustworthy when that layer is enabled, because it
 * strips any client-supplied copies before forwarding the request.
 */
export async function resolveAuthenticatedUser(
  event: H3Event,
): Promise<AuthenticatedUser | null> {
  const principalId = getRequestHeader(event, "x-ms-client-principal-id");

  if (principalId) {
    const user = await User.findOne({ azureId: principalId });
    if (user) {
      return user;
    }
  }

  const principalName = getRequestHeader(event, "x-ms-client-principal-name");

  if (principalName) {
    // Accounts bound to an Azure identity must match on that identity.
    return await User.findOne({
      email: principalName.toLowerCase(),
      azureId: null,
    });
  }

  const devUserEmail = process.env.BENCHKIT_DEV_USER_EMAIL;

  if (import.meta.dev && devUserEmail) {
    return await User.findOne({ email: devUserEmail.toLowerCase() });
  }

  return null;
}

export function requireAuth(event: H3Event): AuthenticatedUser {
  const user = event.context.auth;

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  }

  return user;
}

export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === "admin";
}

export function requireAdmin(event: H3Event): AuthenticatedUser {
  const user = requireAuth(event);

  if (!isAdmin(user)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
    });
  }

  return user;
}
