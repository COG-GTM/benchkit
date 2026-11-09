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
 * The x-ms-client-principal-* headers are only trustworthy when the App
 * Service authentication layer (which strips client-supplied copies) is in
 * front of the app. Azure sets WEBSITE_AUTH_ENABLED when it is; other
 * header-injecting proxies must opt in with NUXT_AUTH_TRUST_PROXY_HEADERS.
 */
function trustsProxyIdentityHeaders(): boolean {
  return (
    process.env.WEBSITE_AUTH_ENABLED?.toLowerCase() === "true" ||
    process.env.NUXT_AUTH_TRUST_PROXY_HEADERS === "true"
  );
}

/**
 * Resolves the caller from the identity headers injected by the Azure
 * App Service / Entra ID authentication layer sitting in front of the app.
 * Returns null when the request carries no verified principal.
 */
export async function resolveAuthenticatedUser(
  event: H3Event,
): Promise<AuthenticatedUser | null> {
  if (!trustsProxyIdentityHeaders()) {
    return null;
  }

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
