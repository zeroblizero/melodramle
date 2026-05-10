const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const normalizeText = normalize;

export const buildSearchIndex = (operas) =>
  operas.flatMap((opera) => {
    const names = [opera.title, ...(opera.alternativeTitles ?? [])];
    return names.map((name) => ({
      opera,
      alias: name,
      normalizedAlias: normalize(name),
    }));
  });

export const findBestOperaMatch = (query, searchIndex) => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return null;
  }

  let best = null;

  searchIndex.forEach((item) => {
    const idx = item.normalizedAlias.indexOf(normalizedQuery);
    if (idx === -1) {
      return;
    }

    const exact = item.normalizedAlias === normalizedQuery;
    const starts = item.normalizedAlias.startsWith(normalizedQuery);
    const score =
      (exact ? 1000 : 0) +
      (starts ? 300 : 0) +
      (100 - Math.min(idx, 100)) +
      (100 - Math.min(item.normalizedAlias.length - normalizedQuery.length, 100));

    if (!best || score > best.score) {
      best = { ...item, score };
    }
  });

  return best;
};
