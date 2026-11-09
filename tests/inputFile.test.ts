import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isSafeInputFilePath,
  validateTestCaseInputs,
} from "../shared/utils/inputFile";

test("accepts upload and sample paths whose extension matches the type", () => {
  assert.ok(isSafeInputFilePath("/uploads/policy_1712345678.pdf", "pdf"));
  assert.ok(isSafeInputFilePath("/uploads/scan_1.JPG", "img"));
  assert.ok(isSafeInputFilePath("/uploads/notes_1.txt", "txt"));
  assert.ok(isSafeInputFilePath("/uploads/data_1.json", "json"));
  assert.ok(isSafeInputFilePath("/samples/document_1.pdf", "pdf"));
});

test("rejects script, external and traversal URLs", () => {
  for (const file of [
    "javascript:alert(document.domain)",
    "JavaScript:alert(1)//.pdf",
    " javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://attacker.example/policy.pdf",
    "//attacker.example/policy.pdf",
    "/\\attacker.example/policy.pdf",
    "/uploads//attacker.example/x.pdf",
    "/uploads/../secret.pdf",
    "/uploads/..%2fsecret.pdf",
    "/uploads/a/b.pdf",
    "/uploads/x.pdf?x=1",
    "/uploads/x.pdf#x",
    "/uploads/x\n.pdf",
    "uploads/x.pdf",
    "public/samples/document_1.pdf",
    "/api/seed.pdf",
    "",
  ]) {
    assert.equal(isSafeInputFilePath(file, "pdf"), false, file);
  }
  assert.equal(isSafeInputFilePath(undefined, "pdf"), false);
  assert.equal(
    isSafeInputFilePath({ toString: () => "/uploads/x.pdf" }),
    false,
  );
});

test("rejects files whose extension does not match the type", () => {
  assert.equal(isSafeInputFilePath("/uploads/page.html", "pdf"), false);
  assert.equal(isSafeInputFilePath("/uploads/image.svg", "img"), false);
  assert.equal(isSafeInputFilePath("/uploads/doc.pdf", "img"), false);
  assert.equal(isSafeInputFilePath("/uploads/doc", "txt"), false);
});

test("validateTestCaseInputs reports the first invalid input", () => {
  assert.equal(validateTestCaseInputs(undefined), null);
  assert.equal(
    validateTestCaseInputs([
      { type: "pdf", file: "/uploads/a_1.pdf", filename: "a.pdf" },
    ]),
    null,
  );
  assert.match(
    validateTestCaseInputs([
      { type: "pdf", file: "/uploads/a_1.pdf", filename: "a.pdf" },
      { type: "pdf", file: "javascript:alert(1)", filename: "policy.pdf" },
    ])!,
    /^inputs\[1\]\.file/,
  );
  assert.match(
    validateTestCaseInputs([{ type: "exe", file: "/uploads/a.exe" }])!,
    /type/,
  );
  assert.match(validateTestCaseInputs("x")!, /array/);
  assert.match(validateTestCaseInputs([null])!, /object/);
});
