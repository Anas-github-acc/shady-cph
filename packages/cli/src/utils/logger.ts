import kleur from 'kleur';
import ora, { type Ora } from 'ora';

export const logger = {
  info: (msg: string) => console.log(kleur.cyan('ℹ'), msg),
  success: (msg: string) => console.log(kleur.green('✔'), msg),
  warn: (msg: string) => console.log(kleur.yellow('⚠'), msg),
  error: (msg: string) => console.error(kleur.red('✖'), msg),
  plain: (msg: string) => console.log(msg),
  spinner: (text: string): Ora => ora({ text, color: 'cyan' }).start()
};

export { kleur };
