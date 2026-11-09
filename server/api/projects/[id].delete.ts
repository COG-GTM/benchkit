import { Project } from "~~/models";

export default defineEventHandler(async (event) => {
  const { project } = await requireProjectOwner(event);

  await Project.deleteOne({ _id: project._id });

  return { success: true, message: "Project deleted successfully" };
});
