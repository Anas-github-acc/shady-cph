import { z } from "zod";
export declare const PayloadSchema: z.ZodObject<{
    parser: z.ZodOptional<z.ZodObject<{
        version: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version: string | number;
        name: string;
    }, {
        version: string | number;
        name: string;
    }>>;
    platform: z.ZodString;
    problem_number: z.ZodOptional<z.ZodString>;
    contest_number: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    contestId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    question_label: z.ZodOptional<z.ZodString>;
    problemIndex: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    question_url: z.ZodOptional<z.ZodString>;
    testcase: z.ZodObject<{
        input: z.ZodString;
        output: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        input: string;
        output: string;
    }, {
        input: string;
        output: string;
    }>;
}, "strip", z.ZodTypeAny, {
    platform: string;
    testcase: {
        input: string;
        output: string;
    };
    parser?: {
        version: string | number;
        name: string;
    } | undefined;
    problem_number?: string | undefined;
    contest_number?: string | number | undefined;
    contestId?: string | number | undefined;
    question_label?: string | undefined;
    problemIndex?: string | undefined;
    label?: string | undefined;
    question_url?: string | undefined;
}, {
    platform: string;
    testcase: {
        input: string;
        output: string;
    };
    parser?: {
        version: string | number;
        name: string;
    } | undefined;
    problem_number?: string | undefined;
    contest_number?: string | number | undefined;
    contestId?: string | number | undefined;
    question_label?: string | undefined;
    problemIndex?: string | undefined;
    label?: string | undefined;
    question_url?: string | undefined;
}>;
export declare const SubmissionSchema: z.ZodObject<{
    sourceCode: z.ZodString;
    filename: z.ZodString;
    programTypeId: z.ZodOptional<z.ZodString>;
    language: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sourceCode: string;
    filename: string;
    language: string;
    programTypeId?: string | undefined;
}, {
    sourceCode: string;
    filename: string;
    language: string;
    programTypeId?: string | undefined;
}>;
export type CPSubmission = z.infer<typeof SubmissionSchema>;
export type CPPayload = z.infer<typeof PayloadSchema>;
//# sourceMappingURL=index.d.ts.map