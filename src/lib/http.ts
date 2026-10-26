export async function fetchText(
  url: string,
  timeoutMs = 4500,
  maxBytes = 8_000_000,
): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "User-Agent": "MacX/2.0 (+football scores)",
      Accept: "application/json,text/html",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Kaynak HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Kaynak boş yanıt verdi.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("Kaynak yanıtı çok büyük.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export async function fetchJson(url: string, timeoutMs = 4500): Promise<any> {
  return JSON.parse(await fetchText(url, timeoutMs));
}
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const result: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        try {
          result[i] = { status: "fulfilled", value: await fn(items[i]) };
        } catch (reason) {
          result[i] = { status: "rejected", reason };
        }
      }
    }),
  );
  return result;
}
