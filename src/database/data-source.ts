import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database-options';
import { databaseEntities } from './entities';

config({ quiet: true });

const migrationExtension = __filename.endsWith('.ts') ? 'ts' : 'js';

export default new DataSource({
  ...createDatabaseOptions((key) => process.env[key]),
  entities: databaseEntities,
  migrations: [join(__dirname, 'migrations', `*.${migrationExtension}`)],
  synchronize: false,
  dropSchema: false,
  migrationsRun: false,
});
