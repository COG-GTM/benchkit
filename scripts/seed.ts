import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { Project, TestCase, User } from "../models";

async function seedDatabase() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/benchkit";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  try {
    // Clear existing data (development only)
    await User.deleteMany({});
    await Project.deleteMany({});
    await TestCase.deleteMany({});

    const adminUser = await User.create({
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
      azureId: "azure-admin-id",
    });

    const reviewerUser = await User.create({
      email: "reviewer@example.com",
      name: "Reviewer User",
      role: "reviewer",
      azureId: "azure-reviewer-id",
    });

    const regularUser = await User.create({
      email: "user@example.com",
      name: "Regular User",
      role: "user",
      azureId: "azure-user-id",
    });

    const project1 = await Project.create({
      name: "Insurance Documents",
      description: "Processing insurance policy documents",
      owner: adminUser._id,
      members: [reviewerUser._id, regularUser._id],
    });

    const project2 = await Project.create({
      name: "Medical Records",
      description: "Medical document extraction and validation",
      owner: adminUser._id,
      members: [reviewerUser._id],
    });

    let testCases = 0;

    for (let i = 1; i <= 10; i++) {
      await TestCase.create({
        inputs: [
          {
            type: "pdf",
            file: `public/samples/document_${i}.pdf`,
            filename: `insurance_policy_${i}.pdf`,
          },
          {
            type: "img",
            file: `public/samples/image_${i}.png`,
            filename: `document_image_${i}.png`,
          },
        ],
        original: {
          policy_number: `POL-${1000 + i}`,
          policy_holder: `John Doe ${i}`,
          coverage_amount: 100000 + i * 5000,
          effective_date: "2024-01-01",
          expiry_date: "2025-01-01",
          premium: 1200 + i * 50,
          information_about_the_owner: {
            policy_account_owner_1: {
              name: `Policy Holder ${i}`,
              address: `${100 + i} Main Street, City, State`,
              phone: `555-0${100 + i}`,
              email: `holder${i}@example.com`,
            },
          },
        },
        assigned: [
          {
            user: reviewerUser._id,
            project: i <= 5 ? project1._id : project2._id,
          },
        ],
        validated:
          i <= 3
            ? [
                {
                  timestamp: new Date(),
                  user: reviewerUser._id,
                  comment: `Validation completed for sample ${i}`,
                  data: {
                    policy_number: `POL-${1000 + i}`,
                    policy_holder: `John Doe ${i} (Validated)`,
                    coverage_amount: 100000 + i * 5000,
                    validation_status: "approved",
                  },
                },
              ]
            : [],
      });
      testCases++;
    }

    console.log("Database seeded successfully:", {
      users: 3,
      projects: 2,
      testCases,
    });
  } finally {
    await mongoose.disconnect();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  seedDatabase().catch((error) => {
    console.error("Error seeding database:", error);
    process.exitCode = 1;
  });
}

export default seedDatabase;
