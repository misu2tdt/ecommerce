import type { DataSourceOptions } from 'typeorm';
import {
  assertSafeDemoSeedDatabase,
  DEMO_DEVELOPMENT_DATABASE,
  DEMO_TEST_DATABASE,
} from './demo-seed-safety';

function dataSourceWith(database: string) {
  return {
    options: {
      type: 'postgres',
      database,
      synchronize: false,
      dropSchema: false,
    } as DataSourceOptions,
  };
}

describe('assertSafeDemoSeedDatabase', () => {
  it('accepts only the explicit development target for the real command', () => {
    expect(() =>
      assertSafeDemoSeedDatabase(
        dataSourceWith(DEMO_DEVELOPMENT_DATABASE),
        'development',
        'development',
      ),
    ).not.toThrow();
  });

  it('rejects production before mutation', () => {
    expect(() =>
      assertSafeDemoSeedDatabase(
        dataSourceWith(DEMO_DEVELOPMENT_DATABASE),
        'development',
        'production',
      ),
    ).toThrow('disabled when NODE_ENV=production');
  });

  it.each([
    'postgres',
    'template0',
    'template1',
    DEMO_TEST_DATABASE,
    'ecommerce_prod',
    'unknown',
  ])('rejects unsafe development database %s', (database) => {
    expect(() =>
      assertSafeDemoSeedDatabase(
        dataSourceWith(database),
        'development',
        'development',
      ),
    ).toThrow(`requires database ${DEMO_DEVELOPMENT_DATABASE}`);
  });

  it('allows the isolated automated-test target only in NODE_ENV=test', () => {
    expect(() =>
      assertSafeDemoSeedDatabase(
        dataSourceWith(DEMO_TEST_DATABASE),
        'test',
        'test',
      ),
    ).not.toThrow();
    expect(() =>
      assertSafeDemoSeedDatabase(
        dataSourceWith(DEMO_TEST_DATABASE),
        'test',
        'development',
      ),
    ).toThrow('requires NODE_ENV=test');
  });
});
