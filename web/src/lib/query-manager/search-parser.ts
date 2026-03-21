export type ParsedSearch = {
  text: string;
  tags: string[];
  domains: string[];
  is: string[];
};

export function parseSearchQuery(raw: string): ParsedSearch {
  const tokens = raw.split(/\s+/).filter(Boolean);
  const tags: Set<string> = new Set();
  const domains: Set<string> = new Set();
  const is: Set<string> = new Set();
  const textParts: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower.startsWith("tag:")) {
      const val = lower.slice(4);
      if (val) tags.add(val);
    } else if (lower.startsWith("domain:")) {
      const val = lower.slice(7);
      if (val) domains.add(val);
    } else if (lower.startsWith("is:")) {
      const val = lower.slice(3);
      if (val) is.add(val);
    } else {
      textParts.push(token);
    }
  }

  return {
    text: textParts.join(" "),
    tags: [...tags],
    domains: [...domains],
    is: [...is],
  };
}
