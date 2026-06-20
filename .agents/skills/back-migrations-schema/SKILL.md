---
name: migrations-schema
description: "Triggers when modifying the database schema (adding columns, indices, tables), writing migrations in migrations.ts using the client query callback, or updating schemaTables.ts and schemaIndexes.ts."
---

# Database Migrations and Schemas

This skill explains how the database migration runner operates in the backend, how to apply schema changes securely for both fresh installations and existing databases, and why it is mandatory to use the callback `client` instead of the global `db` wrapper.

---

## 1. Migration Runner Flow

When the application boots, the main process calls `initDb()` in [db.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/electron/db.ts). Database initialization follows a strict order:

1. Establishes a database client connection to the Postgres pool.
2. Executes the main table generation script defined in [schemaTables.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/electron/schemaTables.ts) (`CREATE TABLE IF NOT EXISTS`).
3. Runs `runMigrations(db, client)` from [migrations.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/electron/migrations.ts) to apply versioned updates.
4. Executes the database index generation script defined in [schemaIndexes.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/electron/schemaIndexes.ts) (`CREATE INDEX IF NOT EXISTS`).

The migration runner reads the `schema_migrations` table to determine which migration versions have already been applied, skipping completed migrations to ensure each script runs **exactly once**.

---

## 2. Using the `client: PoolClient` Callback (Critical Rule)

When writing database updates in [migrations.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/electron/migrations.ts), you must write the `up` function using the local `client` parameter:

```typescript
up: async (client: PoolClient) => {
  // CORRECT:
  await client.query(`ALTER TABLE expenses ADD COLUMN status VARCHAR(50)`);

  // INCORRECT (NEVER USE 'db'):
  // await db.execute(`ALTER TABLE expenses ADD COLUMN status VARCHAR(50)`); 
}
```

### Why you must never use `db` inside `up()`:
1. **Transaction Isolation**: The migration runner executes each migration inside an isolated transaction block (`BEGIN` / `COMMIT` / `ROLLBACK`) managed directly via the `client` connection.
2. Using the global `db` wrapper executes queries outside of this local connection thread, running them on a different connection from the pool. If a migration fails mid-run, it will be impossible to roll back successfully, potentially corrupting the production database schema.

---

## 3. Guide to Adding or Modifying Schemas

When making structural changes to the database, you must update both the clean installation schemas and write an incremental migration:

### A. Clean Installations (Fresh Databases)
* If adding a new table, declare it in [schemaTables.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/electron/schemaTables.ts).
* If adding a new index, declare it in [schemaIndexes.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/electron/schemaIndexes.ts).

### B. Existing Databases (Production Migrations)
* Open [migrations.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/electron/migrations.ts) and add a new object at the end of the `MIGRATIONS` array.
* Increment the `version` key to the next available number.
* Assign a descriptive `name` and write the schema alterations inside `up` using `client.query()`.

### Example Migration Adding a Column:
```typescript
// Inside the MIGRATIONS array in migrations.ts
{
  version: 31,
  name: 'add_category_to_expenses',
  isApplied: async (client: PoolClient) => {
    // Check if the column is already present to prevent execution errors
    const { rows } = await client.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'expenses' AND column_name = 'category'
    `);
    return rows.length > 0;
  },
  up: async (client: PoolClient) => {
    await client.query(`
      ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'general'
    `);
  }
}
```

---

## 4. Bootstrapping Legacy Databases
If the application runs on a database that already has tables (e.g. `users`) but the control table `schema_migrations` is empty, the runner automatically executes the `isApplied()` helper for each migration version. This rebuilds the migration history dynamically without re-executing scripts for structures that already exist in the database.
