export const DEVELOPMENT_DATABASE = 'ecommerce_dev';
export const INTEGRATION_DATABASE = 'ecommerce_test';
export const MANAGED_DATABASES = [
  DEVELOPMENT_DATABASE,
  INTEGRATION_DATABASE,
] as const;

const LOCAL_DATABASE_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const DOCKER_RESOURCE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

export interface DevSetupConfig {
  nodeEnvironment: string;
  databaseHost: string;
  databasePort: number;
  databaseUsername: string;
  databasePassword: string;
  databaseName: string;
  containerName: string;
  hostPort: number;
  volumeName: string;
  composeProject: string;
}

export interface DevSetupDependencies {
  startDatabase(config: DevSetupConfig): Promise<void>;
  waitForDatabase(config: DevSetupConfig): Promise<void>;
  ensureDatabases(config: DevSetupConfig): Promise<readonly string[]>;
  runNpmScript(script: 'migration:run' | 'seed:demo'): Promise<void>;
}

export function loadDevSetupConfig(
  environment: NodeJS.ProcessEnv,
): DevSetupConfig {
  const databasePort = readPort(environment.DB_PORT, 'DB_PORT');
  const config: DevSetupConfig = {
    nodeEnvironment: environment.NODE_ENV?.trim() || 'development',
    databaseHost: requireValue(environment.DB_HOST, 'DB_HOST'),
    databasePort,
    databaseUsername: requireValue(environment.DB_USERNAME, 'DB_USERNAME'),
    databasePassword: requireValue(environment.DB_PASSWORD, 'DB_PASSWORD'),
    databaseName: requireValue(environment.DB_NAME, 'DB_NAME'),
    containerName: environment.DEV_DB_CONTAINER_NAME?.trim() || 'ecom_db',
    hostPort: readPort(
      environment.DEV_DB_HOST_PORT?.trim() || String(databasePort),
      'DEV_DB_HOST_PORT',
    ),
    volumeName:
      environment.DEV_DB_VOLUME_NAME?.trim() || 'ecommerce_postgres_data',
    composeProject:
      environment.DEV_DB_COMPOSE_PROJECT?.trim() || 'ecommerce-local',
  };
  assertSafeDevSetup(config);
  return config;
}

export function assertSafeDevSetup(config: DevSetupConfig): void {
  if (config.nodeEnvironment === 'production') {
    throw new Error('Local development setup is disabled in production');
  }
  if (config.databaseName !== DEVELOPMENT_DATABASE) {
    throw new Error(`dev:setup requires DB_NAME=${DEVELOPMENT_DATABASE}`);
  }
  if (!LOCAL_DATABASE_HOSTS.has(config.databaseHost.toLowerCase())) {
    throw new Error('dev:setup requires a loopback DB_HOST');
  }
  if (config.databasePort !== config.hostPort) {
    throw new Error('DB_PORT and DEV_DB_HOST_PORT must match');
  }
  for (const [key, value] of [
    ['DEV_DB_CONTAINER_NAME', config.containerName],
    ['DEV_DB_VOLUME_NAME', config.volumeName],
    ['DEV_DB_COMPOSE_PROJECT', config.composeProject],
  ] as const) {
    if (!DOCKER_RESOURCE_NAME.test(value)) {
      throw new Error(`${key} contains unsupported characters`);
    }
  }
}

export function missingManagedDatabases(
  existingDatabases: readonly string[],
): readonly (typeof MANAGED_DATABASES)[number][] {
  const existing = new Set(existingDatabases);
  return MANAGED_DATABASES.filter((database) => !existing.has(database));
}

export async function runDevSetup(
  config: DevSetupConfig,
  dependencies: DevSetupDependencies,
): Promise<readonly string[]> {
  assertSafeDevSetup(config);
  await dependencies.startDatabase(config);
  await dependencies.waitForDatabase(config);
  const createdDatabases = await dependencies.ensureDatabases(config);
  await dependencies.runNpmScript('migration:run');
  await dependencies.runNpmScript('seed:demo');
  return createdDatabases;
}

function requireValue(value: string | undefined, key: string): string {
  if (!value?.trim()) throw new Error(`${key} must be configured in .env`);
  return value.trim();
}

function readPort(value: string | undefined, key: string): number {
  const port = Number(requireValue(value, key));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${key} must be an integer between 1 and 65535`);
  }
  return port;
}
