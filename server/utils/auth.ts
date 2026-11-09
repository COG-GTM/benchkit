import type { H3Event } from "h3";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { HydratedDocument } from "mongoose";
import { User, type IUser } from "~~/models";

export type AuthenticatedUser = HydratedDocument<IUser>;

declare module "h3" {
  interface H3EventContext {
    auth?: AuthenticatedUser;
  }
}

interface EntraConfig {
  issuer: string;
  audiences: string[];
  jwks: JWTVerifyGetKey;
}

let cachedConfig: EntraConfig | null | undefined;

function getEntraConfig(): EntraConfig | null {
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;

  if (!tenantId || !clientId) {
    console.warn(
      "AZURE_TENANT_ID / AZURE_CLIENT_ID are not set; all API requests will be rejected as unauthenticated",
    );
    cachedConfig = null;
    return cachedConfig;
  }

  const authority = `https://login.microsoftonline.com/${tenantId}`;

  cachedConfig = {
    issuer: process.env.AZURE_AUTH_ISSUER || `${authority}/v2.0`,
    audiences: [clientId, `api://${clientId}`],
    jwks: createRemoteJWKSet(
      new URL(
        process.env.AZURE_AUTH_JWKS_URI || `${authority}/discovery/v2.0/keys`,
      ),
    ),
  };
  return cachedConfig;
}

/**
 * Reads the caller's Entra ID token: an `Authorization: Bearer` header, or the
 * ID token that Azure App Service Authentication forwards to the app.
 */
function getRequestToken(event: H3Event): string | undefined {
  const authorization = getRequestHeader(event, "authorization");
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);

  return match?.[1] || getRequestHeader(event, "x-ms-token-aad-id-token");
}

/**
 * Verifies the caller's Entra ID token signature, issuer, audience and expiry,
 * and maps its `oid` claim to a BenchKit user by `azureId`.
 */
export async function resolveAuthenticatedUser(
  event: H3Event,
): Promise<AuthenticatedUser | null> {
  const config = getEntraConfig();
  const token = getRequestToken(event);

  if (!config || !token) {
    return null;
  }

  let oid: unknown;
  try {
    const { payload } = await jwtVerify(token, config.jwks, {
      issuer: config.issuer,
      audience: config.audiences,
      algorithms: ["RS256"],
    });
    oid = payload.oid;
  } catch {
    return null;
  }

  if (typeof oid !== "string" || !oid) {
    return null;
  }

  return await User.findOne({ azureId: oid });
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
