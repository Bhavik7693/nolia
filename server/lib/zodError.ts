import type { ZodError } from "zod";

export function formatZodError(err: ZodError): string {
  const issues = err.issues
    .slice(0, 5)
    .map((i) => {
      const path = i.path.join(".");
      return path ? `${path}: ${i.message}` : i.message;
    });

  return issues.join(", ");
}
