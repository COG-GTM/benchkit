import type { H3Event } from "h3";
import { Types, type HydratedDocument } from "mongoose";
import { User, type IUser } from "~~/models";

export type AuthenticatedUser = HydratedDocument<IUser>;

declare module "h3" {
  interface H3EventContext {
    auth?: AuthenticatedUser | null;
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Resolves the caller according to `runtimeConfig.auth.mode`:
 * - `easyauth`: Azure App Service / Entra ID authentication in front of the
 *   app. The `x-ms-client-principal-id` header (set by Easy Auth, which strips
 *   client-supplied copies) must match a user's `azureId`.
 * - `dev`: `nuxt dev` only; every request acts as `auth.devUserEmail`.
 * Any other value resolves no one, so every API request is rejected.
 */
export async function resolveAuthenticatedUser(
  event: H3Event,
): Promise<AuthenticatedUser | null> {
  const { mode, devUserEmail } = useRuntimeConfig(event).auth;

  if (mode === "easyauth") {
    const principalId = getRequestHeader(event, "x-ms-client-principal-id");
    return principalId
      ? await User.findOne({ azureId: principalId.trim() })
      : null;
  }

  if (mode === "dev" && import.meta.dev && devUserEmail) {
    return await User.findOne({ email: devUserEmail.trim().toLowerCase() });
  }

  return null;
}

/**
 * Rejects state-changing requests sent by a browser from another site, so a
 * cross-site form cannot ride an ambient sign-in session.
 */
export function assertSameOriginWrite(event: H3Event) {
  if (SAFE_METHODS.has(event.method)) {
    return;
  }

  const fetchSite = getRequestHeader(event, "sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw createError({
      statusCode: 403,
      statusMessage: "Cross-site request rejected",
    });
  }

  const origin = getRequestHeader(event, "origin");
  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost !== getRequestHost(event)) {
      throw createError({
        statusCode: 403,
        statusMessage: "Cross-site request rejected",
      });
    }
  }
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
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  return user;
}

export function assertObjectId(id: string | undefined): string {
  if (!id || !Types.ObjectId.isValid(id)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid user ID" });
  }
  return id;
}

/** Allows admins, or the caller acting on their own account; otherwise 403. */
export function requireSelfOrAdmin(
  event: H3Event,
  targetUserId: string,
): AuthenticatedUser {
  const user = requireAuth(event);
  const isSelf = new Types.ObjectId(targetUserId).equals(
    user._id as unknown as Types.ObjectId,
  );

  if (!isAdmin(user) && !isSelf) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  return user;
}

/** Reads a JSON object body; form-encoded and text bodies are rejected. */
export async function readJsonObject(
  event: H3Event,
): Promise<Record<string, unknown>> {
  const contentType = getRequestHeader(event, "content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw createError({
      statusCode: 415,
      statusMessage: "Content-Type must be application/json",
    });
  }

  const body = await readBody(event);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request body must be a JSON object",
    });
  }

  return body as Record<string, unknown>;
}

/** Strips the Azure identity binding unless the caller is an admin. */
export function serializeUser(
  user: AuthenticatedUser,
  caller: AuthenticatedUser,
) {
  const data = user.toObject();
  if (!isAdmin(caller)) {
    delete data.azureId;
  }
  return data;
}

export function toHttpError(error: unknown, fallbackMessage: string) {
  const err = (error ?? {}) as {
    statusCode?: number;
    statusMessage?: string;
    code?: number;
    name?: string;
  };
  if (err.statusCode) {
    return createError({
      statusCode: err.statusCode,
      statusMessage: err.statusMessage,
    });
  }
  if (err.code === 11000) {
    return createError({
      statusCode: 409,
      statusMessage: "User with this email or Azure ID already exists",
    });
  }
  if (err.name === "ValidationError" || err.name === "CastError") {
    return createError({ statusCode: 400, statusMessage: "Invalid user data" });
  }
  return createError({ statusCode: 500, statusMessage: fallbackMessage });
}
