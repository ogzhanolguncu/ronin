export const COLLECTION_COLORS = [
  { id: 1, key: "shu",     value: "oklch(0.48 0.16 30)"  },  // red/rust
  { id: 2, key: "ai",      value: "oklch(0.42 0.08 255)" },  // indigo
  { id: 3, key: "matsu",   value: "oklch(0.55 0.16 145)" },  // green
  { id: 4, key: "kitsune", value: "oklch(0.45 0.14 75)"  },  // amber/fox
  { id: 5, key: "fuji",    value: "oklch(0.55 0.12 300)" },  // purple/wisteria
  { id: 6, key: "sora",    value: "oklch(0.58 0.12 230)" },  // sky blue
  { id: 7, key: "sakura",  value: "oklch(0.65 0.12 350)" },  // cherry blossom pink
  { id: 8, key: "kin",     value: "oklch(0.70 0.14 85)"  },  // gold
  { id: 9, key: "susu",    value: "oklch(0.55 0.01 260)" },  // cool gray/soot
  { id: 10, key: "umi",    value: "oklch(0.45 0.12 245)" },  // deep ocean blue
] as const

export type CollectionColorId = (typeof COLLECTION_COLORS)[number]["id"]

export function getCollectionColor(id: CollectionColorId) {
  return COLLECTION_COLORS.find((c) => c.id === id)
}
