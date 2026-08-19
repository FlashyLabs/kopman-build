import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error("DATABASE_URL is required")

// Migration client bypasses RLS
export const migrationClient = postgres(
  process.env.DATABASE_URL_MIGRATOR ?? connectionString,
  { max: 1 }
)

// App client goes through RLS — always call withTenant() before querying
const pgClient = postgres(connectionString, { max: 10 })
export const db = drizzle(pgClient, { schema })

// Wrap a callback in a transaction with tenant_id set for RLS
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      `SET LOCAL app.current_tenant_id = '${tenantId.replace(/'/g, "''")}'`
    )
    return fn(tx as unknown as typeof db)
  })
}
