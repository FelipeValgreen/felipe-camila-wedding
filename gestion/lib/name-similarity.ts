export type NameMatch<T> = { item: T; score: number };

export function normalizePersonName(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function editDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = previous[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + cost);
      diagonal = old;
    }
  }
  return previous[b.length];
}

export function nameSimilarity(left: string, right: string) {
  const a = normalizePersonName(left);
  const b = normalizePersonName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const maxLength = Math.max(a.length, b.length);
  let score = 1 - editDistance(a, b) / maxLength;
  const aTokens = a.split(' ');
  const bTokens = b.split(' ');
  const bSet = new Set(bTokens);
  const common = aTokens.filter(token => bSet.has(token)).length;
  const tokenCoverage = common / Math.max(aTokens.length, bTokens.length);
  score = Math.max(score, tokenCoverage * 0.92);

  const shorter = a.length <= b.length ? a : b;
  const shorterTokens = shorter.split(' ');
  const longer = a.length > b.length ? a : b;
  if (shorterTokens.length >= 2 && shorter.length >= 7 && longer.includes(shorter)) {
    score = Math.max(score, 0.84);
  }

  return Math.max(0, Math.min(1, score));
}

export function suggestNameMatches<T>(
  query: string,
  items: T[],
  getName: (item: T) => string,
  threshold = 0.8,
  limit = 3
): NameMatch<T>[] {
  return items
    .map(item => ({ item, score: nameSimilarity(query, getName(item)) }))
    .filter(match => match.score >= threshold && match.score < 1)
    .sort((a, b) => b.score - a.score || getName(a.item).localeCompare(getName(b.item), 'es'))
    .slice(0, limit);
}
