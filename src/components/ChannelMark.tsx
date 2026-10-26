function family(name: string) {
  const text = name.toLowerCase();
  if (text.includes("bein")) return "bein";
  if (text.includes("tabii")) return "tabii";
  if (text.includes("trt")) return "trt";
  if (text.includes("s sport") || text.includes("ssport")) return "s";
  return "other";
}

const plate: Record<ReturnType<typeof family>, string> = {
  bein: "#0e6b52",
  s: "#1d4fa8",
  trt: "#c8102e",
  tabii: "#6a3a96",
  other: "#4d6278",
};

const short: Record<ReturnType<typeof family>, string> = {
  bein: "beIN",
  s: "S",
  trt: "TRT",
  tabii: "tabii",
  other: "TV",
};

export function ChannelMark({ name }: { name: string }) {
  const kind = family(name);
  return (
    <span className={`chan ${kind}`}>
      <svg viewBox="0 0 36 22" aria-hidden="true">
        <rect width="36" height="22" rx="5" fill={plate[kind]} />
        <text
          x="18"
          y="15"
          textAnchor="middle"
          fontSize={kind === "s" ? "13" : "8"}
          fontFamily="Arial, sans-serif"
          fontWeight="700"
          fill="#ffffff"
        >
          {short[kind]}
        </text>
      </svg>
      <span>{name}</span>
    </span>
  );
}

export function ChannelList({ channels }: { channels: string[] }) {
  if (!channels.length) return <span className="chan miss">Kanal yok</span>;
  return channels.map((name) => <ChannelMark key={name} name={name} />);
}
