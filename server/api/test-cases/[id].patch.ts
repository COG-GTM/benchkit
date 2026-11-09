import { Project, TestCase, User } from "~~/models";
import { parseTestCaseUpdate } from "../../utils/testCaseUpdate";

export default defineEventHandler(async (event) => {
  try {
    const { caller, testCase } = await authorizeTestCase(event, "update");

    const contentType = getRequestHeader(event, "content-type") || "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      throw createError({
        statusCode: 415,
        statusMessage: "Content-Type must be application/json",
      });
    }

    const update = parseTestCaseUpdate(await readBody(event));

    if (update.assigned) {
      const newProjects = update.assigned.map((a) => a.project);
      const newUsers = update.assigned.flatMap((a) => (a.user ? [a.user] : []));

      // The edit form resends `assigned` unchanged, so only a real change
      // needs the owner check below.
      const assignmentKey = (list: { project: unknown; user?: unknown }[]) =>
        list
          .map((a) => `${String(a.project)}:${a.user ? String(a.user) : ""}`)
          .sort()
          .join(",");
      const assignmentChanged =
        assignmentKey(update.assigned) !== assignmentKey(testCase.assigned);

      // Reassignment is a project-owner decision: a non-admin must own every
      // project the case currently belongs to and every project it moves to.
      if (
        assignmentChanged &&
        !isAdmin(caller) &&
        !(await ownsAllProjects(caller, [
          ...testCase.assigned.map((a) => a.project),
          ...newProjects,
        ]))
      ) {
        throw createError({
          statusCode: 403,
          statusMessage: "Only project owners can change test case assignments",
        });
      }

      const uniqueProjects = [...new Set(newProjects.map(String))];
      const uniqueUsers = [...new Set(newUsers.map(String))];
      const [projectCount, userCount] = await Promise.all([
        Project.countDocuments({ _id: { $in: uniqueProjects } }),
        User.countDocuments({ _id: { $in: uniqueUsers } }),
      ]);
      if (
        projectCount !== uniqueProjects.length ||
        userCount !== uniqueUsers.length
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: "assigned references an unknown project or user",
        });
      }
    }

    const updatedTestCase = await TestCase.findByIdAndUpdate(
      testCase._id,
      { $set: update },
      { new: true, runValidators: true },
    )
      .populate("assigned.project", "name")
      .populate("assigned.user", "name email");

    if (!updatedTestCase) {
      throw createError({
        statusCode: 404,
        statusMessage: "Test case not found",
      });
    }

    return updatedTestCase;
  } catch (error) {
    const { statusCode, statusMessage } = error as {
      statusCode?: number;
      statusMessage?: string;
    };
    throw createError({
      statusCode: statusCode || 500,
      statusMessage: statusMessage || "Internal server error",
    });
  }
});
