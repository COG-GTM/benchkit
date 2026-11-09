import type { H3Event } from "h3";
import { Types, type HydratedDocument } from "mongoose";
import { Project, TestCase, type ITestCase } from "~~/models";
import type { AuthenticatedUser } from "./auth";

export type TestCaseAction = "read" | "update" | "delete";

export interface AuthorizedTestCase {
  caller: AuthenticatedUser;
  testCase: HydratedDocument<ITestCase>;
}

export async function ownsAllProjects(
  caller: AuthenticatedUser,
  projectIds: Types.ObjectId[],
): Promise<boolean> {
  const unique = [...new Set(projectIds.map(String))];
  if (unique.length === 0) {
    return false;
  }
  const owned = await Project.countDocuments({
    _id: { $in: unique },
    owner: caller._id,
  });
  return owned === unique.length;
}

/**
 * Loads a test case and checks the caller may perform `action` on it.
 * Admins may do anything. Owners of a project the case is assigned to may
 * read and update it, and may delete it only if they own every assigned
 * project. The assigned reviewer may read and update it.
 */
export async function authorizeTestCase(
  event: H3Event,
  action: TestCaseAction,
): Promise<AuthorizedTestCase> {
  const caller = requireAuth(event);
  const testCaseId = getRouterParam(event, "id");

  if (!testCaseId || !Types.ObjectId.isValid(testCaseId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Valid test case ID is required",
    });
  }

  const testCase = await TestCase.findById(testCaseId);

  if (!testCase) {
    throw createError({
      statusCode: 404,
      statusMessage: "Test case not found",
    });
  }

  if (isAdmin(caller)) {
    return { caller, testCase };
  }

  const callerId = new Types.ObjectId(String(caller._id));
  const projectIds = testCase.assigned.map((a) => a.project);
  const isAssignedUser = testCase.assigned.some((a) =>
    a.user?.equals(callerId),
  );
  const ownsProject =
    projectIds.length > 0 &&
    (await Project.exists({
      _id: { $in: projectIds.map(String) },
      owner: callerId,
    })) !== null;

  const allowed =
    action === "delete"
      ? ownsProject && (await ownsAllProjects(caller, projectIds))
      : ownsProject || isAssignedUser;

  if (!allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
    });
  }

  return { caller, testCase };
}
