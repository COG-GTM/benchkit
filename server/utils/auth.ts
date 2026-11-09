import type { H3Event } from "h3";
import type { HydratedDocument } from "mongoose";
import { User, type IUser } from "~~/models";

export type AuthenticatedUser = HydratedDocument<IUser>;

declare module "h3" {
  interface H3EventContext {
    user?: AuthenticatedUser | null;
  }
}

/** Fields non-admin callers may see for users other than themselves. */
export const PUBLIC_USER_FIELDS = "name";

/**
 * Resolves the caller from the principal headers set by Azure App Service
 * Authentication (Easy Auth), which strips client-supplied copies of them.
 * A principal id must match a user's `azureId`; the principal name is only
 * accepted as an email match for users with no Azure identity bound.
 */
export async function resolveUser(
  event: H3Event,
): Promise<AuthenticatedUser | null> {
  if (event.context.user !== undefined) {
    return event.context.user;
  }

  const principalId = getRequestHeader(event, "x-ms-client-principal-id");
  const principalName = getRequestHeader(event, "x-ms-client-principal-name");

  let user: AuthenticatedUser | null = null;

  if (principalId?.trim()) {
    user = await User.findOne({ azureId: principalId.trim() });
  }

  if (!user && principalName?.trim()) {
    user = await User.findOne({
      email: principalName.trim().toLowerCase(),
      azureId: { $in: [null, ""] },
    });
  }

  event.context.user = user;
  return user;
}

export async function requireUser(event: H3Event): Promise<AuthenticatedUser> {
  const user = await resolveUser(event);

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

export async function requireAdmin(event: H3Event): Promise<AuthenticatedUser> {
  const user = await requireUser(event);

  if (!isAdmin(user)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Admin access required",
    });
  }

  return user;
}
