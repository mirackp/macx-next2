import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

// Application content is kept outside Hostinger's replaceable deployment directory.
// MySQL is required for production writes; the file adapter is for local development.
const useFile = () =>
  process.env.MACX_STORAGE === "file" ||
  (!process.env.DB_NAME && process.env.NODE_ENV !== "production");
export function storageReady() {
  return useFile() || Boolean(process.env.DB_NAME && process.env.DB_USER);
}
let pool: Pool | undefined;
let schema: Promise<void> | undefined;
async function db() {
  if (!storageReady())
    throw new Error(
      "MySQL yapılandırılmadı. Hostinger ortam değişkenlerini tamamlayın.",
    );
  if (!pool)
    pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME,
      connectionLimit: 5,
      connectTimeout: 5000,
      charset: "utf8mb4",
      timezone: "Z",
    });
  if (!schema)
    schema = pool
      .query(
        "CREATE TABLE IF NOT EXISTS macx_documents (id VARCHAR(191) PRIMARY KEY, body LONGTEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
      )
      .then(() => undefined)
      .catch((error) => {
        schema = undefined;
        throw error;
      });
  await schema;
  return pool;
}
function file(id: string) {
  return path.join(
    process.env.MACX_DATA_DIR || path.join(process.cwd(), ".runtime"),
    `${Buffer.from(id).toString("base64url")}.json`,
  );
}
export async function getDoc<T>(id: string): Promise<T | null> {
  if (useFile()) {
    try {
      return JSON.parse(await fs.readFile(file(id), "utf8")) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  if (!storageReady()) return null;
  const [rows] = await (
    await db()
  ).execute<RowDataPacket[]>("SELECT body FROM macx_documents WHERE id=?", [
    id,
  ]);
  return rows[0] ? (JSON.parse(rows[0].body) as T) : null;
}
export async function setDoc<T>(id: string, value: T) {
  if (useFile()) {
    const target = file(id);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const tmp = target + "." + randomUUID() + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(value));
    await fs.rename(tmp, target);
    return;
  }
  await (
    await db()
  ).execute(
    "INSERT INTO macx_documents (id,body) VALUES (?,?) ON DUPLICATE KEY UPDATE body=VALUES(body)",
    [id, JSON.stringify(value)],
  );
}
export async function insertDoc<T>(id: string, value: T): Promise<boolean> {
  if (useFile()) {
    const target = file(id);
    await fs.mkdir(path.dirname(target), { recursive: true });
    try {
      await fs.writeFile(target, JSON.stringify(value), { flag: "wx" });
      return true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") return false;
      throw e;
    }
  }
  const [result] = await (
    await db()
  ).execute<mysql.ResultSetHeader>(
    "INSERT IGNORE INTO macx_documents (id,body) VALUES (?,?)",
    [id, JSON.stringify(value)],
  );
  return result.affectedRows === 1;
}
export async function deleteDoc(id: string) {
  if (useFile()) {
    await fs.rm(file(id), { force: true });
    return;
  }
  await (await db()).execute("DELETE FROM macx_documents WHERE id=?", [id]);
}
export async function listDocs<T>(prefix: string): Promise<T[]> {
  if (useFile()) {
    const dir = path.dirname(file(""));
    try {
      const names = await fs.readdir(dir);
      const rows = await Promise.all(
        names
          .filter(
            (n) =>
              n.endsWith(".json") &&
              Buffer.from(n.slice(0, -5), "base64url")
                .toString()
                .startsWith(prefix),
          )
          .map((n) =>
            fs
              .readFile(path.join(dir, n), "utf8")
              .then((v) => JSON.parse(v) as T),
          ),
      );
      return rows;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
  }
  if (!storageReady()) return [];
  const [rows] = await (
    await db()
  ).execute<RowDataPacket[]>(
    "SELECT body FROM macx_documents WHERE id LIKE ?",
    [prefix.replace(/[\\%_]/g, "\\$&") + "%"],
  );
  return rows.map((r) => JSON.parse(r.body) as T);
}
export async function closeStore() {
  if (pool) {
    await pool.end();
    pool = undefined;
    schema = undefined;
  }
}
const locks = new Map<string, Promise<unknown>>();
export async function mutateDoc<T>(
  id: string,
  change: (current: T | null) => T,
): Promise<T> {
  if (useFile()) {
    const previous = locks.get(id) || Promise.resolve();
    const next = previous
      .catch(() => {})
      .then(async () => {
        const value = change(await getDoc<T>(id));
        await setDoc(id, value);
        return value;
      });
    locks.set(id, next);
    try {
      return await next;
    } finally {
      if (locks.get(id) === next) locks.delete(id);
    }
  }
  const connection = await (await db()).getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      "INSERT IGNORE INTO macx_documents (id,body) VALUES (?,?)",
      [id, "null"],
    );
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT body FROM macx_documents WHERE id=? FOR UPDATE",
      [id],
    );
    const value = change(rows[0] ? JSON.parse(rows[0].body) : null);
    await connection.execute("UPDATE macx_documents SET body=? WHERE id=?", [
      JSON.stringify(value),
      id,
    ]);
    await connection.commit();
    return value;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
