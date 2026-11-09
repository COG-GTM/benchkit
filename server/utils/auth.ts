import type { H3Event } from "h3";
import type { HydratedDocument } from "mongoose";
import { User, type IUser } from "~~/models";

export type AuthenticatedUser = HydratedDocument<IUser>;

declare module "h3" {
  interface H3EventContext {
    auth: AuthenticatedUser | null;
  }
}

/**
 * Resolves the caller from the identity headers injected by the Azure
 * App Service / Entra ID authentication layer sitting in front of the app.
 * Returns null when the request carries no verified principal.
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
    // Accounts bound to an Azure identity must match on that identity, so an
    // unmatched principal id can never be resolved by name instead.
    return await User.findOne({
      email: principalName.toLowerCase(),
      azureId: null,
    });
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
