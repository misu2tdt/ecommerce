import type { DataSourceOptions } from 'typeorm';
import {
  assertSafeTestDatabase,
  expectedTestDatabaseName,
} from './database-safety';

function dataSourceWith(overrides: Partial<DataSourceOptions> = {}): {
  options: DataSourceOptions;
} {
  return {
    options: {
      type: 'postgres',
      database: expectedTestDatabaseName,
      synchronize: false,
      dropSchema: false,
      ...overrides,
    } as DataSourceOptions,
  };
}

describe('assertSafeTestDatabase', () => {
  it('accepts the isolated test database configuration', () => {
    expect(() =>
      assertSafeTestDatabase(dataSourceWith(), 'test'),
    ).not.toThrow();
  });

  it('rejects a non-test environment', () => {
    expect(() =>
      assertSafeTestDatabase(dataSourceWith(), 'development'),
    ).toThrow();
  });

  it('rejects a database without the _test suffix', () => {
    expect(() =>
      assertSafeTestDatabase(
        dataSourceWith({ database: 'ecommerce_ci' }),
        'test',
      ),
    ).toThrow();
  });

  it.each(['ecommerce_dev', 'postgres'])(
    'rejects protected database %s',
    (database) => {
      expect(() =>
        assertSafeTestDatabase(dataSourceWith({ database }), 'test'),
      ).toThrow();
    },
  );

  it('rejects synchronize=true', () => {
    expect(() =>
      assertSafeTestDatabase(dataSourceWith({ synchronize: true }), 'test'),
    ).toThrow();
  });

  it('rejects dropSchema=true', () => {
    expect(() =>
      assertSafeTestDatabase(dataSourceWith({ dropSchema: true }), 'test'),
    ).toThrow();
  });
});
