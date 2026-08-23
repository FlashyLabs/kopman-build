import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

// Lazy initialization — clients created on first use so build succeeds without DB env vars
let _db: ReturnType<typeof drizzle> | null = null
let _migrationClient: ReturnType<typeof postgres> | null = null

export function getMigrationClient() {
  if (!_migrationClient) {
    const url = process.env.DATABASE_URL_MIGRATOR ?? process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL is required")
    _migrationClient = postgres(url, { max: 1 })
  }
  return _migrationClient
}

function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL is required")
    _db = drizzle(postgres(url, { max: 10 }), { schema })
  }
  return _db
}

// Proxy so callers use `db.select(...)` unchanged
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getDb() as any)[prop]
  },
})

export const migrationClient = new Proxy({} as ReturnType<typeof postgres>, {
  get(_target, prop) {
    return (getMigrationClient() as any)[prop]
  },
})

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
