#!/usr/bin/env node
/**
 * Database Migration Runner
 * Automatically runs schema migrations when DATABASE_URL is available
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        console.log('⚠️  No DATABASE_URL found. Skipping migrations.');
        console.log('   App will run in demo mode.');
        return;
    }

    console.log('🔄 Running database migrations...');

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Run migrations
        await client.query(schema);
        console.log('✅ Schema migrations completed successfully');

        // Verify tables exist
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('📋 Created tables:');
        result.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

    } catch (error) {
        console.error('❌ Migration error:', error.message);

        // Check if tables already exist
        if (error.message.includes('already exists')) {
            console.log('ℹ️  Tables already exist. Skipping migration.');
        } else {
            throw error;
        }
    } finally {
        await client.end();
    }
}

// Run migrations
runMigrations()
    .then(() => {
        console.log('✅ Migration process complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
