import { z } from "zod";

export type ValidationIssue = {
  field: string;
  message: string;
};

export type FormattedValidationError = {
  error: "Invalid input";
  issues: ValidationIssue[];
};

function formatIssuePath(path: PropertyKey[]): string {
  if (path.length === 0) return "_root";

  return path.reduce<string>((acc, seg, index) => {
    if (index === 0) return String(seg);
    if (typeof seg === "number") return `${acc}[${seg}]`;
    return `${acc}.${String(seg)}`;
  }, "");
}

function formatIssueMessage(issue: z.core.$ZodIssue): string {
  if (issue.code === "invalid_type" && issue.input === undefined) {
    return "Required";
  }

  return issue.message;
}

export function formatZodValidationError(error: z.ZodError): FormattedValidationError {
  return {
    error: "Invalid input",
    issues: error.issues.map((issue) => ({
      field: formatIssuePath(issue.path),
      message: formatIssueMessage(issue),
    })),
  };
}

export function formatZodValidationErrorText(error: z.ZodError): string {
  return JSON.stringify(formatZodValidationError(error), null, 2);
}
