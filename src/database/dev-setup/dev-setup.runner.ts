import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { loadDevSetupConfig, runDevSetup } from './dev-setup';
import { LocalDatabaseRuntime } from './dev-setup-runtime';

type Command = 'setup' | 'up' | 'down';

async function main(): Promise<void> {
  const environmentPath = resolve(process.cwd(), '.env');
  if (!existsSync(environmentPath)) {
    throw new Error(
      'Missing .env; copy .env.example to .env before local setup',
    );
  }
  loadDotenv({ path: environmentPath, quiet: true });

  const command = process.argv[2] as Command | undefined;
  if (!command || !['setup', 'up', 'down'].includes(command)) {
    throw new Error('Expected one of: setup, up, down');
  }

  const setupConfig = loadDevSetupConfig(process.env);
  const runtime = new LocalDatabaseRuntime();

  if (command === 'down') {
    await runtime.stopDatabase(setupConfig);
    return;
  }
  if (command === 'up') {
    await runtime.startDatabase(setupConfig);
    await runtime.waitForDatabase(setupConfig);
    return;
  }

  await runDevSetup(setupConfig, runtime);
  console.log('Local development setup completed.');
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Local development setup failed: ${message}`);
  process.exitCode = 1;
});
