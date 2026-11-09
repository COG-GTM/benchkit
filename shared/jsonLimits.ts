export const JSON_LIMITS = {
  maxBytes: 256 * 1024,
  maxNodes: 5000,
  maxDepth: 20,
} as const;

export const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

export type JsonLimitViolation =
  | "not_object"
  | "too_large"
  | "too_many_nodes"
  | "too_deep";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Returns the first limit a JSON document breaks, or null when it is within
 * bounds. Nodes are counted as every object key and array element, so the
 * count matches the number of fields JsonValidator would render.
 */
export function checkJsonLimits(
  value: unknown,
  limits: {
    maxBytes: number;
    maxNodes: number;
    maxDepth: number;
  } = JSON_LIMITS,
): JsonLimitViolation | null {
  if (!isPlainObject(value)) return "not_object";

  let nodes = 0;
  const stack: Array<{ node: unknown; depth: number }> = [
    { node: value, depth: 1 },
  ];
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    if (typeof node !== "object" || node === null) continue;
    if (depth > limits.maxDepth) return "too_deep";
    const children = Array.isArray(node) ? node : Object.values(node);
    nodes += children.length;
    if (nodes > limits.maxNodes) return "too_many_nodes";
    for (const child of children) stack.push({ node: child, depth: depth + 1 });
  }

  const serialized = JSON.stringify(value);
  if (new TextEncoder().encode(serialized).length > limits.maxBytes) {
    return "too_large";
  }
  return null;
}

export function describeJsonLimitViolation(
  field: string,
  violation: JsonLimitViolation,
): string {
  switch (violation) {
    case "not_object":
      return `${field} must be a JSON object`;
    case "too_large":
      return `${field} exceeds ${JSON_LIMITS.maxBytes / 1024} KB`;
    case "too_many_nodes":
      return `${field} has more than ${JSON_LIMITS.maxNodes} fields`;
    case "too_deep":
      return `${field} is nested deeper than ${JSON_LIMITS.maxDepth} levels`;
  }
}
