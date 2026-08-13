import type { DataSourceOptions } from 'typeorm';
import {
  type ConfigReader,
  getDatabasePort,
  getRequiredConfig,
} from '../config/environment';

type PostgresDataSourceOptions = Extract<
  DataSourceOptions,
  { type: 'postgres' }
>;

export type DatabaseOptions = Pick<
  PostgresDataSourceOptions,
  'type' | 'host' | 'port' | 'username' | 'password' | 'database'
>;

export function createDatabaseOptions(reader: ConfigReader): DatabaseOptions {
  return {
    type: 'postgres',
    host: getRequiredConfig(reader, 'DB_HOST'),
    port: getDatabasePort(reader),
    username: getRequiredConfig(reader, 'DB_USERNAME'),
    password: getRequiredConfig(reader, 'DB_PASSWORD'),
    database: getRequiredConfig(reader, 'DB_NAME'),
  };
}
