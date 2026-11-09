import type { H3Event } from "h3";
import { User, type IUser } from "~~/models";

export interface SessionUser {
  _id: string;
  email: string;
  name: string;
  role: IUser["role"];
}

declare module "h3" {
  interface H3EventContext {
    user?: SessionUser;
  }
}

// Set by Azure App Service Authentication (Easy Auth), which strips any
// client-supplied copy of this header before forwarding the request.
const EASY_AUTH_PRINCIPAL_ID_HEADER = "x-ms-client-principal-id";

const toSessionUser = (
  user: Pick<IUser, "email" | "name" | "role"> & { _id: unknown },
): SessionUser => ({
  _id: String(user._id),
  email: user.email,
  name: user.name,
  role: user.role,
});

export async function resolveSessionUser(
  event: H3Event,
): Promise<SessionUser | null> {
  const { auth } = useRuntimeConfig(event);

  if (auth.trustEasyAuth) {
    const principalId = getRequestHeader(
      event,
      EASY_AUTH_PRINCIPAL_ID_HEADER,
    )?.trim();
    if (principalId) {
      const user = await User.findOne({ azureId: principalId }).lean();
      return user ? toSessionUser(user) : null;
    }
  }

  const devUserEmail = String(auth.devUserEmail || "")
    .trim()
    .toLowerCase();
  if (import.meta.dev && devUserEmail) {
    const user = await User.findOneAndUpdate(
      { email: devUserEmail },
      {
        $setOnInsert: {
          email: devUserEmail,
          name: "Local Developer",
          role: "admin",
        },
      },
      { upsert: true, new: true, lean: true },
    );
    return toSessionUser(user);
  }

  return null;
}

export function requireSessionUser(event: H3Event): SessionUser {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  }
  return user;
}
