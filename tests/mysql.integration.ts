import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  getDoc,
  setDoc,
  insertDoc,
  mutateDoc,
  listDocs,
  deleteDoc,
  closeStore,
} from "../src/lib/store";
test(
  "MySQL kalıcılık, ekleme yarışı ve satır kilidi",
  { skip: process.env.MACX_MYSQL_TEST !== "1" },
  async () => {
    assert(
      process.env.DB_NAME?.endsWith("_test"),
      "Yalnızca _test veritabanında çalıştırılabilir.",
    );
    assert.notEqual(process.env.MACX_STORAGE, "file");
    const prefix = "ci:" + randomUUID() + ":";
    try {
      await setDoc(prefix + "record", { name: "Türkçe: ı İ ş ğ ç ö ü" });
      assert.deepEqual(await getDoc(prefix + "record"), {
        name: "Türkçe: ı İ ş ğ ç ö ü",
      });
      assert.equal(
        await insertDoc(prefix + "record", { name: "üzerine yazma" }),
        false,
      );
      await Promise.all(
        Array.from({ length: 20 }, () =>
          mutateDoc<number>(prefix + "counter", (n) => (n || 0) + 1),
        ),
      );
      assert.equal(await getDoc(prefix + "counter"), 20);
      assert.equal((await listDocs(prefix)).length, 2);
      await deleteDoc(prefix + "record");
      assert.equal(await getDoc(prefix + "record"), null);
    } finally {
      for (const id of ["record", "counter"]) await deleteDoc(prefix + id);
      await closeStore();
    }
  },
);
