import type { H3Event } from "h3";
import type { HydratedDocument } from "mongoose";
import { User, type IUser } from "~~/models";

export type AuthenticatedUser = HydratedDocument<IUser>;

declare module "h3" {
  interface H3EventContext {
    user?: AuthenticatedUser | null;
  }
}

// Set by Azure App Service Authentication (Easy Auth) to the signed-in user's
// Entra ID object id. App Service strips client-supplied copies of this header,
// so it is only trusted when the app is deployed behind Easy Auth.
const PRINCIPAL_ID_HEADER = "x-ms-client-principal-id";

function trustsAppServiceHeaders(): boolean {
  const value = useRuntimeConfig().auth?.trustAppServiceHeaders;
  return String(value) === "true";
}

export async function resolveRequestUser(
  event: H3Event,
): Promise<AuthenticatedUser | null> {
  if (!trustsAppServiceHeaders()) {
    return null;
  }

  const principalId = getRequestHeader(event, PRINCIPAL_ID_HEADER)?.trim();
  if (!principalId) {
    return null;
  }

  return await User.findOne({ azureId: principalId });
}

export function requireUser(event: H3Event): AuthenticatedUser {
  const user = event.context.user;

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  }

  return user;
}

export function requireAdmin(event: H3Event): AuthenticatedUser {
  const user = requireUser(event);

  if (user.role !== "admin") {
    throw createError({
      statusCode: 403,
      statusMessage: "Admin role required",
    });
  }

  return user;
}
