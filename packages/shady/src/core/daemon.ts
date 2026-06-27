import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocketPlugin from '@fastify/websocket';
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

export const SubmissionSchema = z.object({
  sourceCode: z.string(),
  filename: z.string(),
  programTypeId: z.string().optional(),
  language: z.string(),
});


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

export function parseProblemFromUrl(urlStr: string): { contest?: string; problem?: string } | null {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes('codeforces.com')) {
      const match1 = url.pathname.match(/\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/);
      if (match1) return { contest: match1[1], problem: match1[2] };
      const match2 = url.pathname.match(/\/problem\/(\d+)\/([A-Za-z0-9]+)/);
      if (match2) return { contest: match2[1], problem: match2[2] };
    } else if (url.hostname.includes('atcoder.jp')) {
      const match = url.pathname.match(/\/contests\/([^/]+)\/tasks\/([^/]+)/);
      if (match) {
        const contest = match[1];
        const task = match[2];
        const problem = task.startsWith(contest + '_') ? task.slice(contest.length + 1) : task;
        return { contest, problem };
      }
    }
  } catch (e) {}
  return null;
}

export async function runDaemon(opts: { port?: number }) {
  const config = await loadConfig();
  const port = opts.port ?? config.server.port;
  const testcaseDir = resolveTestcaseDir(config);

  const app = Fastify({ logger: false });


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

        let problemLabel = payload.label;
        const problemNumber = payload.problem_number ?? payload.problemIndex;
        const contestNumber = payload.contest_number ?? payload.contestId;

        if (!problemLabel) {
          if (problemNumber !== undefined && contestNumber !== undefined) {
            problemLabel = `${contestNumber}${problemNumber}`;
          }
        }
        if (!problemLabel && payload.question_url) {
          const parsed = parseProblemFromUrl(payload.question_url);
          if (parsed && parsed.contest && parsed.problem) {
            problemLabel = `${parsed.contest}${parsed.problem}`;
          }
        }

        if (!problemLabel) {
          return reply.status(400).send({
            ok: false,
            error: 'Missing problem identification (need problem_number or contest_number + question_label)',
          });
        }

        console.log(`[${timestamp}] Processing incoming testcase for ${problemLabel} (${payload.platform})...`);

        const filePath = testcaseFilePath(
          testcaseDir,
          problemLabel,
          payload.platform
        );

        const { totalCases } = await writeTestCase(filePath, payload.testcase);

        await writeRunLatest(
          testcaseDir,
          testcaseFileName(problemLabel, payload.platform)
        );

        console.log(
          `[${new Date().toISOString()}] Saved testcase for ${problemLabel} (${payload.platform}) — ${totalCases} case(s) total`
        );

        return reply.send({
          ok: true,
          file: testcaseFileName(problemLabel, payload.platform),
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

  // Register Websocket
  await app.register(websocketPlugin)

  let connectedSockets: any[] = [];

  app.get('/stream', { websocket: true }, (socket, req) => {
    if (!socket) {
      console.error(`[${new Date().toISOString()}] Empty WebSocket socket.`);
      return;
    }

    connectedSockets.push(socket);
    console.log(`[${new Date().toISOString()}] Browser extension established a live socket stream.`);

    socket.on('close', (code: number, reason: string) => {
      connectedSockets = connectedSockets.filter(s => s !== socket);
    });

    socket.on('error', (err: any) => {
      console.error(`[${new Date().toISOString()}] Socket error:`, err);
    });

    // Handle heartbeats (PING/PONG) to keep MV3 service workers alive
    socket.on('message', (message: any) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'PING') {
          socket.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch (e) {
        // Ignore non-JSON/unsupported messages
      }
    });
  });

  app.post('/submit', async (request, reply) => {
    try {
      const submission = SubmissionSchema.parse(request.body);

      connectedSockets.forEach((s, idx) => {
        console.log(`  -> Socket [${idx}] readyState: ${s?.readyState}`);
      });

      // 1 = WebSocket.OPEN
      connectedSockets = connectedSockets.filter(socket => socket && socket.readyState === 1);

      if (connectedSockets.length === 0) {
        return reply.status(503).send({ 
          ok: false, 
          error: 'No active browser tab is connected',
          debugInfo: "Check server console. connectedSockets array evaluated to empty."
        });
      }

      const payload = JSON.stringify({ type: 'SHADY_SUBMIT', data: submission });
      connectedSockets.forEach(socket => {
        try {
          socket.send(payload);
        } catch (e) {
          console.error(`[${new Date().toISOString()}] Error sending payload to socket:`, e);
        }
      });

      return reply.send({ ok: true, status: 'relayed_to_browser' });
    } catch (err: any) {
      return reply.status(400).send({ ok: false, error: err.message });
    }
  });

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
