import { runMigrations } from './database';

/**
 * Standalone migration runner.
 * Usage: npx tsx src/config/run-migrations.ts
 */
console.log('[Migration] Starting...');
runMigrations();
console.log('[Migration] Complete!');
process.exit(0);
