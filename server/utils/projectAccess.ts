import type { Types } from "mongoose";
import { Project } from "~~/models";
import { isAdmin, type AuthenticatedUser } from "./auth";

/**
 * Project ids the caller may read: every project for admins (`null`),
 * otherwise the projects the caller owns or is a member of.
 */
export async function getAccessibleProjectIds(
  user: AuthenticatedUser,
): Promise<Types.ObjectId[] | null> {
  if (isAdmin(user)) {
    return null;
  }

  const projects = await Project.find({
    $or: [{ owner: user._id }, { members: user._id }],
  })
    .select("_id")
    .lean();

  return projects.map((project) => project._id as unknown as Types.ObjectId);
}
