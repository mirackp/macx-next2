export const cast = [
  {
    id: "kertenkele",
    name: "Kertenkele",
    role: "Moderatör",
    position: "50%",
    tag: "Masayı bir arada tutar.",
    description:
      "Takım elbiseli moderatör. Tartışmanın ritmini yönetir, soruları sorar ve sözü ekibe dağıtır.",
  },
  {
    id: "tilki",
    name: "Tilki",
    role: "Yorumcu",
    position: "0%",
    tag: "Oyunun arkasındaki hamle.",
    description:
      "Taktik tahtasına farklı açıdan bakar. Maçın kırılma anlarını ve teknik tercihleri masaya yatırır.",
  },
  {
    id: "karga",
    name: "Karga",
    role: "Yorumcu",
    position: "25%",
    tag: "Sözü dolandırmadan.",
    description:
      "Sahadaki tartışmalı anları konuşur. Keskin soruları ve doğrudan üslubuyla sohbete hareket katar.",
  },
  {
    id: "kaplumbaga",
    name: "Kaplumbağa",
    role: "Yorumcu",
    position: "75%",
    tag: "Oyunu sakin okumak.",
    description:
      "Sonuca acele etmeden bakar. Tecrübe, süreklilik ve takım dengesi üzerine düşünür.",
  },
  {
    id: "kedi",
    name: "Kedi",
    role: "Yorumcu",
    position: "100%",
    tag: "Ayrıntı gözünden kaçmaz.",
    description:
      "Küçük pozisyonlardan büyük hikâyeler çıkarır. Futbolun duygusunu ve ince detaylarını takip eder.",
  },
] as const;
export const resultLabels = {
  pending: "Bekliyor",
  won: "Başarılı",
  lost: "Başarısız",
  void: "İptal",
} as const;
