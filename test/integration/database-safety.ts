import type { DataSourceOptions } from 'typeorm';

export const expectedTestDatabaseName = 'ecommerce_test';

type GuardedDataSource = {
  options: DataSourceOptions;
};

export function assertSafeTestDatabase(
  dataSource: GuardedDataSource,
  nodeEnvironment = process.env.NODE_ENV,
): void {
  if (nodeEnvironment !== 'test') {
    throw new Error('Destructive database operation requires NODE_ENV=test');
  }

  const database = dataSource.options.database;
  if (typeof database !== 'string' || database.length === 0) {
    throw new Error('Resolved test database name must be a non-empty string');
  }

  if (!database.endsWith('_test')) {
    throw new Error('Resolved test database name must end with _test');
  }

  if (
    ['postgres', 'template0', 'template1', 'ecommerce_dev'].includes(database)
  ) {
    throw new Error('Refusing to mutate a protected database');
  }

  if (database !== expectedTestDatabaseName) {
    throw new Error(`Resolved database must be ${expectedTestDatabaseName}`);
  }

  if (dataSource.options.synchronize !== false) {
    throw new Error('Test DataSource synchronize must be false');
  }

  if (dataSource.options.dropSchema !== false) {
    throw new Error('Test DataSource dropSchema must be false');
  }
}
