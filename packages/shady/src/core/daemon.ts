import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import fs from 'fs-extra';
import path from 'node:path';
import { loadConfig, resolveTestcaseDir } from './config.js';
import {
  writeTestCase,
  testcaseFileName,
  testcaseFilePath,
  writeRunLatest,
} from './testcase.js';
import { getDaemonPaths } from './daemonPaths.js';
import { PayloadSchema } from "@repo/shared-schemas";

// const PayloadSchema = z.object({
//   parser: z.object({
//     version: z.union([z.string(), z.number()]),
//     name: z.string(),
//   }).optional(),
//   platform: z.string(),
//   problem_number: z.string().optional(),
//   contest_number: z.union([z.string(), z.number()]).optional(),
//   contestId: z.union([z.string(), z.number()]).optional(),
//   question_label: z.string().optional(),
//   problemIndex: z.string().optional(),
//   label: z.string().optional(),
//   question_url: z.string().optional(),
//   testcase: z.object({
//     input: z.string(),
//     output: z.string(),
//   }),
// });

const BodySchema = {
  type: 'object',
  required: ['platform', 'testcase'],
  properties: {
    parser: {
      type: 'object',
      properties: {
        version: { anyOf: [{ type: 'string' }, { type: 'number' }] },
        name: { type: 'string' },
      },
    },
    platform: { type: 'string' },
    problem_number: { type: 'string' },
    contest_number: { anyOf: [{ type: 'string' }, { type: 'number' }] },
    contestId: { anyOf: [{ type: 'string' }, { type: 'number' }] },
    question_label: { type: 'string' },
    problemIndex: { type: 'string' },
    label: { type: 'string' },
    question_url: { type: 'string' },
    testcase: {
      type: 'object',
      required: ['input', 'output'],
      properties: {
        input: { type: 'string' },
        output: { type: 'string' },
      },
    },
  },
};

export function parseProblemFromUrl(urlStr: string): { contest?: string; label?: string } | null {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes('codeforces.com')) {
      const match1 = url.pathname.match(/\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/);
      if (match1) return { contest: match1[1], label: match1[2] };
      const match2 = url.pathname.match(/\/problem\/(\d+)\/([A-Za-z0-9]+)/);
      if (match2) return { contest: match2[1], label: match2[2] };
    } else if (url.hostname.includes('atcoder.jp')) {
      const match = url.pathname.match(/\/contests\/([^/]+)\/tasks\/([^/]+)/);
      if (match) {
        const contest = match[1];
        const task = match[2];
        const label = task.startsWith(contest + '_') ? task.slice(contest.length + 1) : task;
        return { contest, label };
      }
    }
  } catch (e) {}
  return null;
}

export async function runDaemon(opts: { port?: number }) {
  const config = await loadConfig();
  const port = opts.port ?? config.server.port;
  const testcaseDir = resolveTestcaseDir(config);

  const app = Fastify({
    logger: false,
  });

  await app.register(cors, {
    origin: true,
    methods: ['POST'],
  });

  // Health check endpoint
  app.get('/health', async (request, reply) => {
    return { status: 'ok' };
  });

  // POST endpoint to receive testcases
  app.post(
    '/',
    {
      schema: {
        body: BodySchema,
      },
    },
    async (request, reply) => {
      const timestamp = new Date().toISOString();
      try {
        const payload = PayloadSchema.parse(request.body);

        let problemNumber = payload.problem_number;
        if (!problemNumber) {
          const contest = payload.contest_number ?? payload.contestId;
          const label = payload.question_label ?? payload.problemIndex ?? payload.label;
          if (contest !== undefined && label !== undefined) {
            problemNumber = `${contest}${label}`;
          }
        }
        if (!problemNumber && payload.question_url) {
          const parsed = parseProblemFromUrl(payload.question_url);
          if (parsed && parsed.contest && parsed.label) {
            problemNumber = `${parsed.contest}${parsed.label}`;
          }
        }

        if (!problemNumber) {
          return reply.status(400).send({
            ok: false,
            error: 'Missing problem identification (need problem_number or contest_number + question_label)',
          });
        }

        console.log(`[${timestamp}] Processing incoming testcase for ${problemNumber} (${payload.platform})...`);

        const filePath = testcaseFilePath(
          testcaseDir,
          problemNumber,
          payload.platform
        );

        const { totalCases } = await writeTestCase(filePath, payload.testcase);

        await writeRunLatest(
          testcaseDir,
          testcaseFileName(problemNumber, payload.platform)
        );

        console.log(
          `[${new Date().toISOString()}] Saved testcase for ${problemNumber} (${payload.platform}) — ${totalCases} case(s) total`
        );

        return reply.send({
          ok: true,
          file: testcaseFileName(problemNumber, payload.platform),
          totalCases,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[${new Date().toISOString()}] Rejected incoming testcase: ${message}`);

        return reply.status(400).send({
          ok: false,
          error: message,
        });
      }
    }
  );

  const paths = getDaemonPaths();
  const cleanup = () => {
    try {
      if (fs.existsSync(paths.pid)) {
        const pidStr = fs.readFileSync(paths.pid, 'utf-8');
        if (parseInt(pidStr.trim(), 10) === process.pid) {
          fs.unlinkSync(paths.pid);
        }
      }
    } catch (e) {}
    try {
      if (fs.existsSync(paths.json)) {
        const data = fs.readJsonSync(paths.json);
        if (data.pid === process.pid) {
          fs.unlinkSync(paths.json);
        }
      }
    } catch (e) {}
  };

  process.on('exit', cleanup);

  const shutdown = async (signal: string) => {
    console.log(`[${new Date().toISOString()}] Received ${signal}. Shutting down server...`);
    try {
      await app.close();
    } catch (e) {}
    cleanup();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await app.listen({
      port,
      host: '127.0.0.1',
    });

    console.log(`[${new Date().toISOString()}] shady-cph server listening on http://localhost:${port}`);
    console.log(`[${new Date().toISOString()}] Watching for testcases -> ${testcaseDir}`);
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[${new Date().toISOString()}] Port ${port} is already in use. Is "sd run" already running?`
      );
    } else {
      console.error(`[${new Date().toISOString()}] ${err.message}`);
    }
    cleanup();
    process.exit(1);
  }
}
