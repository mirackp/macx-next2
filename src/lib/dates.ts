export const TIMEZONE = "Europe/Istanbul";
export function dayOf(value: string | number | Date = Date.now()): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (key: string) => parts.find((p) => p.type === key)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function offsetDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00+03:00`);
  date.setUTCDate(date.getUTCDate() + offset);
  return dayOf(date);
}
export function validDay(input: unknown): string {
  const today = dayOf();
  if (
    typeof input !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input) ||
    dayOf(`${input}T12:00:00+03:00`) !== input
  )
    return today;
  return input >= offsetDay(today, -21) && input <= offsetDay(today, 14)
    ? input
    : today;
}
export function timeOf(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export function dayLabel(day: string, short = false) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: short ? "short" : "long",
    ...(short ? {} : { year: "numeric", weekday: "long" }),
  }).format(new Date(`${day}T12:00:00+03:00`));
}
export function fold(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
