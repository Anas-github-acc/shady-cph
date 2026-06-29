const ESCAPE = '\x1b[';
const RESET = `${ESCAPE}0m`;

const COLORS = {
  cyan: `${ESCAPE}36m`,
  green: `${ESCAPE}32m`,
  yellow: `${ESCAPE}33m`,
  red: `${ESCAPE}31m`,
  dim: `${ESCAPE}2m`,
};

export const logger = {
  info: (msg: string) => console.log(`${COLORS.cyan}ℹ${RESET} ${msg}`),
  success: (msg: string) => console.log(`${COLORS.green}✔${RESET} ${msg}`),
  warn: (msg: string) => console.warn(`${COLORS.yellow}⚠${RESET} ${msg}`),
  error: (msg: string, error?: unknown) => {
    console.error(`${COLORS.red}✖${RESET} ${msg}`);
    if (error instanceof Error) {
      console.error(`${COLORS.dim}${error.stack}${RESET}`);
    } else if (error) {
      console.error(`${COLORS.dim}${String(error)}${RESET}`);
    }
  },
  step: (current: number, total: number, msg: string) => {
    console.log(`\n${COLORS.dim}[${current}/${total}]${RESET} ${COLORS.cyan}${msg}${RESET}`);
  }
};
