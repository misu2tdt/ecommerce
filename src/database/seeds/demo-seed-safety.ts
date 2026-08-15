import type { DataSourceOptions } from 'typeorm';

export const DEMO_DEVELOPMENT_DATABASE = 'ecommerce_dev';
export const DEMO_TEST_DATABASE = 'ecommerce_test';

export type DemoSeedTarget = 'development' | 'test';

type GuardedDataSource = {
  options: DataSourceOptions;
};

export function assertSafeDemoSeedDatabase(
  dataSource: GuardedDataSource,
  target: DemoSeedTarget,
  nodeEnvironment = process.env.NODE_ENV,
): void {
  if (nodeEnvironment === 'production') {
    throw new Error('Demo seed is disabled when NODE_ENV=production');
  }

  const database = dataSource.options.database;
  if (typeof database !== 'string' || database.trim().length === 0) {
    throw new Error('Resolved demo seed database must be a non-empty string');
  }

  const expectedDatabase =
    target === 'development' ? DEMO_DEVELOPMENT_DATABASE : DEMO_TEST_DATABASE;
  if (database !== expectedDatabase) {
    throw new Error(
      `Demo seed target ${target} requires database ${expectedDatabase}`,
    );
  }

  if (target === 'test' && nodeEnvironment !== 'test') {
    throw new Error('Demo seed test target requires NODE_ENV=test');
  }

  if (dataSource.options.synchronize !== false) {
    throw new Error('Demo seed DataSource synchronize must be false');
  }
  if (dataSource.options.dropSchema !== false) {
    throw new Error('Demo seed DataSource dropSchema must be false');
  }
}
