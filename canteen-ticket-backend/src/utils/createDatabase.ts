import { Client } from 'pg';
import 'dotenv/config';

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || ''), // ALWAYS string
  database: 'postgres',
});

async function createDatabase() {
  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL server');

    const dbName = process.env.DB_NAME || 'fingerprint_ticket_db';

    try {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✓ Database "${dbName}" created`);
    } catch (err: any) {
      if (err.code === '42P04') {
        console.log(`✓ Database "${dbName}" already exists`);
      } else {
        throw err;
      }
    }

    await client.end();
    console.log('✓ Database setup complete');
  } catch (error) {
    console.error('✗ Failed to create database:', error);
    await client.end();
    process.exit(1);
  }
}

createDatabase();