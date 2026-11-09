import type { H3Event } from "h3";
import { Types } from "mongoose";
import { Project, User } from "~~/models";

export function parseObjectId(value: unknown, label: string): Types.ObjectId {
  if (typeof value !== "string" || !Types.ObjectId.isValid(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${label}`,
    });
  }

  return new Types.ObjectId(value);
}

export async function parseUserIds(
  value: unknown,
  label: string,
): Promise<Types.ObjectId[]> {
  if (!Array.isArray(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${label}`,
    });
  }

  const ids = value.map((id) => parseObjectId(id, label));
  const unique = [...new Map(ids.map((id) => [id.toString(), id])).values()];
  const found = await User.countDocuments({ _id: { $in: unique } });

  if (found !== unique.length) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown ${label}`,
    });
  }

  return unique;
}

export function parseOptionalString(
  value: unknown,
  label: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${label}`,
    });
  }

  return value;
}

export async function parseUserId(
  value: unknown,
  label: string,
): Promise<Types.ObjectId> {
  const [id] = await parseUserIds([value], label);
  return id!;
}

/**
 * Loads a project the caller is allowed to modify: its owner or an admin.
 */
export async function requireProjectOwner(event: H3Event) {
  const user = requireAuth(event);
  const projectId = parseObjectId(getRouterParam(event, "id"), "project ID");

  const project = await Project.findById(projectId);

  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project not found",
    });
  }

  if (!isAdmin(user) && !project.owner.equals(user._id)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only the project owner or an admin can modify it",
    });
  }

  return { user, project };
}
