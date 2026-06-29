import { z } from "zod";
export const PayloadSchema = z.object({
    parser: z.object({
        version: z.union([z.string(), z.number()]),
        name: z.string(),
    }).optional(),
    platform: z.string(),
    problem_number: z.string().optional(),
    contest_number: z.union([z.string(), z.number()]).optional(),
    contestId: z.union([z.string(), z.number()]).optional(),
    question_label: z.string().optional(),
    problemIndex: z.string().optional(),
    label: z.string().optional(),
    question_url: z.string().optional(),
    testcase: z.object({
        input: z.string(),
        output: z.string(),
    }),
});
export const SubmissionSchema = z.object({
    sourceCode: z.string(),
    filename: z.string(),
    // Optional language code override (e.g., "54" for G++17)
    programTypeId: z.string().optional(),
    language: z.string(),
});
//# sourceMappingURL=index.js.map