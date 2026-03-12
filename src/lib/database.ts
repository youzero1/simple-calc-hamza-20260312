import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Calculation } from './entities/Calculation';
import path from 'path';

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), 'data', 'calculator.db');

let dataSource: DataSource | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }

  // Ensure data directory exists
  const fs = await import('fs');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dataSource = new DataSource({
    type: 'better-sqlite3',
    database: dbPath,
    entities: [Calculation],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();
  return dataSource;
}
