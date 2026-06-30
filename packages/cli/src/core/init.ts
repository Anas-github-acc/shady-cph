import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import AdmZip from 'adm-zip';
import prompts from 'prompts';
import { logger, kleur } from '../utils/logger.js';
import { configExists, configPath, saveConfig, ConfigSchema, CONFIG_FILENAME } from '../core/config.js';
import { getCliVersion } from '../core/version.js';

const execAsync = promisify(exec);

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download from ${url}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.outputFile(outputPath, buffer);
}

async function openBrowser(browser: string, url: string): Promise<void> {
  const platform = process.platform;
  let command = '';

  if (platform === 'win32') {
    switch (browser) {
      case 'chrome': command = `start chrome "${url}"`; break;
      case 'chromium': command = `start chromium "${url}"`; break;
      case 'brave': command = `start brave "${url}"`; break;
      case 'firefox': command = `start firefox "${url}"`; break;
      case 'edge': command = `start msedge "${url}"`; break;
      case 'zen': command = `start zen "${url}"`; break;
      case 'arc': command = `start arc "${url}"`; break;
      default: command = `start "${url}"`;
    }
  } else if (platform === 'darwin') {
    switch (browser) {
      case 'chrome': command = `open -a "Google Chrome" "${url}"`; break;
      case 'chromium': command = `open -a "Chromium" "${url}"`; break;
      case 'brave': command = `open -a "Brave Browser" "${url}"`; break;
      case 'firefox': command = `open -a "Firefox" "${url}"`; break;
      case 'safari': command = `open -a "Safari" "${url}"`; break;
      case 'edge': command = `open -a "Microsoft Edge" "${url}"`; break;
      case 'zen': command = `open -a "Zen Browser" "${url}"`; break;
      case 'arc': command = `open -a "Arc" "${url}"`; break;
      default: command = `open "${url}"`;
    }
  } else {
    // Linux and others
    switch (browser) {
      case 'chrome':
        command = `google-chrome-stable "${url}" || google-chrome "${url}"`;
        break;
      case 'chromium':
        command = `chromium "${url}" || chromium-browser "${url}"`;
        break;
      case 'brave':
        command = `brave-browser "${url}" || brave "${url}"`;
        break;
      case 'firefox':
        command = `firefox "${url}"`;
        break;
      case 'edge':
        command = `microsoft-edge "${url}" || microsoft-edge-stable "${url}"`;
        break;
      case 'zen':
        command = `zen-browser "${url}" || zen "${url}"`;
        break;
      case 'arc':
        logger.warn('Arc is not officially supported on Linux.');
        return;
      case 'safari':
        logger.warn('Safari is only supported on macOS.');
        return;
      default:
        command = `xdg-open "${url}"`;
    }
  }

  if (command) {
    try {
      await execAsync(command);
    } catch (err) {
      logger.warn(`Could not automatically open ${browser}. Please open it manually and navigate to ${url}`);
    }
  }
}

export async function initCommand(opts: { yes?: boolean }) {
  const cwd = process.cwd();

  if (await configExists(cwd)) {
    const { overwrite } = opts.yes
      ? { overwrite: true }
      : await prompts({
          type: 'confirm',
          name: 'overwrite',
          message: `${CONFIG_FILENAME} already exists. Re-initialize (testcases are kept)?`,
          initial: false
        });

    if (!overwrite) {
      logger.info('Aborted.');
      return;
    }
  }

  const answers = opts.yes
    ? { port: 42585, testcaseDir: './.testcase' }
    : await prompts([
        { type: 'number', name: 'port', message: 'Server port (for the browser extension)', initial: 42585 },
        { type: 'text', name: 'testcaseDir', message: 'Testcase directory', initial: './.testcase' }
      ]);

  if (!answers.testcaseDir) {
    logger.warn('Aborted.');
    return;
  }

  const config = ConfigSchema.parse({
    version: getCliVersion(),
    server: { port: answers.port },
    testcase: { dir: answers.testcaseDir }
  });

  await fs.ensureDir(path.resolve(cwd, answers.testcaseDir));
  await saveConfig(config, cwd);

  logger.success(`Created ${CONFIG_FILENAME}`);
  logger.success(`Created testcase directory at ${answers.testcaseDir}`);
  logger.plain('');

  // Define the Installation Path (use project name shady-cph/*)
  const installDir = path.join(os.homedir(), 'shady-cph', 'extension');
  const manifestPath = path.join(installDir, 'manifest.json');

  // Check if extension is downloaded
  const isDownloaded = await fs.pathExists(manifestPath);

  if (!isDownloaded) {
    const spinner = logger.spinner('Downloading and extracting extension...');
    try {
      const tempZipPath = path.join(os.tmpdir(), `shady-extension-helper-${Date.now()}.zip`);
      
      // Try standard download URL first, fallback to tag URL if needed
      const urls = [
        'https://github.com/Anas-github-acc/shady-cph/releases/download/ext-latest/shady-extension-helper.zip',
        'https://github.com/Anas-github-acc/shady-cph/releases/tag/ext-latest/shady-extension-helper.zip'
      ];

      let downloadSuccess = false;
      let lastError: any = null;

      for (const url of urls) {
        try {
          await downloadFile(url, tempZipPath);
          downloadSuccess = true;
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!downloadSuccess) {
        throw lastError || new Error('Failed to download extension zip');
      }

      // Use Go's standard archive/zip equivalent (AdmZip in Node.js) to unpack
      await fs.ensureDir(installDir);
      const zip = new AdmZip(tempZipPath);
      zip.extractAllTo(installDir, true);

      // Clean up temp zip
      await fs.remove(tempZipPath);
      spinner.succeed('Extension downloaded and extracted successfully.');
    } catch (err: any) {
      spinner.fail(`Failed to download and extract extension: ${err.message}`);
      logger.info('Please manually download the extension from: https://github.com/Anas-github-acc/shady-cph/releases');
    }

    // Prompt for browser selection - chrome, chromium, brave, firefox, safari, edge, zen, arc
    const { browser } = await prompts({
      type: 'select',
      name: 'browser',
      message: 'Select your browser to load the extension:',
      choices: [
        { title: 'Chrome', value: 'chrome' },
        { title: 'Chromium', value: 'chromium' },
        { title: 'Brave', value: 'brave' },
        { title: 'Firefox', value: 'firefox' },
        { title: 'Edge', value: 'edge' },
        { title: 'Zen', value: 'zen' },
        { title: 'Arc', value: 'arc' },
        { title: 'Safari', value: 'safari' }
      ]
    });

    if (browser) {
      let extensionUrl = '';
      let instructions = '';

      switch (browser) {
        case 'chrome':
          extensionUrl = 'chrome://extensions/';
          instructions = `
1. Open ${kleur.cyan(extensionUrl)} in Google Chrome.
2. Enable ${kleur.yellow('Developer mode')} using the toggle switch in the top-right corner.
3. Click the ${kleur.yellow('Load unpacked')} button in the top-left corner.
4. Select the directory: ${kleur.green(installDir)}
`;
          break;
        case 'chromium':
          extensionUrl = 'chrome://extensions/';
          instructions = `
1. Open ${kleur.cyan(extensionUrl)} in Chromium.
2. Enable ${kleur.yellow('Developer mode')} using the toggle switch in the top-right corner.
3. Click the ${kleur.yellow('Load unpacked')} button in the top-left corner.
4. Select the directory: ${kleur.green(installDir)}
`;
          break;
        case 'brave':
          extensionUrl = 'brave://extensions/';
          instructions = `
1. Open ${kleur.cyan(extensionUrl)} in Brave.
2. Enable ${kleur.yellow('Developer mode')} using the toggle switch in the top-right corner.
3. Click the ${kleur.yellow('Load unpacked')} button in the top-left corner.
4. Select the directory: ${kleur.green(installDir)}
`;
          break;
        case 'firefox':
          extensionUrl = 'about:debugging#/runtime/this-firefox';
          instructions = `
1. Open ${kleur.cyan(extensionUrl)} in Firefox.
2. Click the ${kleur.yellow('Load Temporary Add-on...')} button.
3. Select any file (e.g., ${kleur.yellow('manifest.json')}) inside the directory: ${kleur.green(installDir)}
Note: Temporary add-ons in Firefox are removed when the browser restarts.
`;
          break;
        case 'edge':
          extensionUrl = 'edge://extensions/';
          instructions = `
1. Open ${kleur.cyan(extensionUrl)} in Microsoft Edge.
2. Enable ${kleur.yellow('Developer mode')} using the toggle switch in the bottom-left corner.
3. Click the ${kleur.yellow('Load unpacked')} button.
4. Select the directory: ${kleur.green(installDir)}
`;
          break;
        case 'zen':
          extensionUrl = 'about:debugging#/runtime/this-firefox';
          instructions = `
1. Open ${kleur.cyan(extensionUrl)} in Zen.
2. Click the ${kleur.yellow('Load Temporary Add-on...')} button.
3. Select any file (e.g., ${kleur.yellow('manifest.json')}) inside the directory: ${kleur.green(installDir)}
Note: Temporary add-ons in Zen are removed when the browser restarts.
`;
          break;
        case 'arc':
          extensionUrl = 'arc://extensions/';
          instructions = `
1. Open ${kleur.cyan(extensionUrl)} in Arc.
2. Enable ${kleur.yellow('Developer mode')} using the toggle switch.
3. Click the ${kleur.yellow('Load unpacked')} button.
4. Select the directory: ${kleur.green(installDir)}
`;
          break;
        case 'safari':
          extensionUrl = 'Safari Settings -> Advanced';
          instructions = `
1. Open Safari and go to ${kleur.cyan('Safari -> Settings -> Advanced')}.
2. Check ${kleur.yellow('"Show Develop menu in menu bar"')}.
3. In the menu bar, go to ${kleur.cyan('Develop')} and check ${kleur.yellow('"Allow Unsigned Extensions"')}.
4. Note: Safari requires a compiled app extension. If you are using this extension, please follow Safari-specific web extension conversion or use a chromium-based browser.
`;
          break;
      }

      logger.plain('\n' + kleur.bold('--- Extension Loading Instructions ---'));
      logger.plain(instructions.trim());
      logger.plain('--------------------------------------\n');
      logger.plain(kleur.yellow('Note: Do as the instructions say.'));
      logger.plain('');

      await prompts({
        type: 'text',
        name: 'pressEnter',
        message: 'Press Enter to open the browser...'
      });

      logger.info(`Opening ${browser} to the extension page...`);
      await openBrowser(browser, extensionUrl);
    }
  }

  logger.plain('');
  logger.info(`Next: run "sd run" and point your browser extension at port ${config.server.port}.`);
  logger.info(`Config saved to ${configPath(cwd)}`);
}

