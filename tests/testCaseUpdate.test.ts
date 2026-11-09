import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTestCaseUpdate } from "../server/utils/testCaseUpdate";

const projectId = "64b7f0c2a1b2c3d4e5f60718";
const userId = "64b7f0c2a1b2c3d4e5f60719";

function rejects(body: unknown, message: RegExp) {
  assert.throws(
    () => parseTestCaseUpdate(body),
    (error: { statusCode?: number; statusMessage?: string }) =>
      error.statusCode === 400 && message.test(error.statusMessage ?? ""),
  );
}

describe("parseTestCaseUpdate", () => {
  it("accepts the editable fields", () => {
    const update = parseTestCaseUpdate({
      inputs: [{ type: "pdf", file: "/uploads/a_1.pdf", filename: "a.pdf" }],
      original: { policy_number: "POL-1", nested: { list: [1, 2] } },
      assigned: [{ project: projectId, user: userId }],
    });

    assert.deepEqual(update.inputs, [
      { type: "pdf", file: "/uploads/a_1.pdf", filename: "a.pdf" },
    ]);
    assert.equal(update.original?.policy_number, "POL-1");
    assert.equal(String(update.assigned?.[0]?.project), projectId);
    assert.equal(String(update.assigned?.[0]?.user), userId);
  });

  it("drops an empty assigned user", () => {
    const update = parseTestCaseUpdate({
      assigned: [{ project: projectId, user: "" }],
    });
    assert.equal(update.assigned?.[0]?.user, undefined);
  });

  for (const field of [
    "validated",
    "createdAt",
    "updatedAt",
    "_id",
    "_method",
  ]) {
    it(`rejects ${field}`, () => {
      rejects({ original: {}, [field]: [] }, new RegExp(`"${field}"`));
    });
  }

  it("rejects update operators", () => {
    rejects({ $set: { validated: [] } }, /"\$set"/);
    rejects({ $unset: { original: 1 } }, /"\$unset"/);
  });

  it("rejects $-prefixed keys inside original", () => {
    rejects({ original: { a: { $where: "1" } } }, /\$/);
  });

  it("rejects an empty or non-object body", () => {
    rejects({}, /No updatable fields/);
    rejects(null, /JSON object/);
    rejects("_method=DELETE", /JSON object/);
    rejects([], /JSON object/);
  });

  it("validates input shape", () => {
    rejects({ inputs: {} }, /inputs must be an array/);
    rejects(
      { inputs: [{ type: "exe", file: "/uploads/a", filename: "a" }] },
      /inputs\[0\]\.type/,
    );
    rejects(
      { inputs: [{ type: "pdf", file: "../../etc/passwd", filename: "a" }] },
      /"\.\." segments/,
    );
    rejects(
      { inputs: [{ type: "pdf", file: "/uploads/a", filename: "a", x: 1 }] },
      /"x"/,
    );
  });

  it("validates assignment ids", () => {
    rejects({ assigned: [{ project: "nope" }] }, /assigned\[0\]\.project/);
    rejects(
      { assigned: [{ project: projectId, user: { $ne: null } }] },
      /assigned\[0\]\.user/,
    );
  });

  it("accepts array original", () => {
    const update = parseTestCaseUpdate({ original: [{ a: 1 }, 2] });
    assert.deepEqual(update.original, [{ a: 1 }, 2]);
    rejects({ original: [{ $where: "1" }] }, /\$/);
  });

  it("rejects non-object original", () => {
    rejects({ original: "x" }, /original must be a JSON object or array/);
    rejects({ original: 1 }, /original must be a JSON object or array/);
    rejects({ original: null }, /original must be a JSON object or array/);
  });
});
