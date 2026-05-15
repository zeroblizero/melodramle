export const getYearFeedback = (guessYear, targetYear) => {
  const diff = targetYear - guessYear;

  if (diff === 0) {
    return { symbol: '✅', isCorrect: true , isClose: false };
  }

  const direction = diff > 0 ? '⬆️' : '⬇️';
  if (Math.abs(diff) < 10) {
    return { symbol: `🔥${direction}`, isCorrect: false, isClose: true };
  }

  return { symbol: direction, isCorrect: false, isClose: false };
};

const hashDateString = (value) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const getDailyOpera = (operas, date = new Date()) => {
  const utcDate = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  const index = hashDateString(utcDate) % operas.length;
  return operas[index];
};

export const getRandomOpera = (operas) => operas[Math.floor(Math.random() * operas.length)];

export const filterOperas = (operas, { languages, fromYear, toYear }) =>
  operas.filter((opera) => {
    const languageAllowed = !languages.length || languages.includes(opera.language);
    const fromAllowed = Number.isFinite(fromYear) ? opera.year >= fromYear : true;
    const toAllowed = Number.isFinite(toYear) ? opera.year <= toYear : true;
    return languageAllowed && fromAllowed && toAllowed;
  });

const getComposerInitials = (composerName) => {
  const parts = composerName.split(' ').filter(part => part.length > 0);
  return parts.map(part => part.charAt(0).toUpperCase()).join('. ') + '.';
};

export const getHint = (opera, hintsUsed, composerCorrect) => {
  if (composerCorrect && hintsUsed >= 2) {
    return null;
  }

  if (composerCorrect) {
    if (hintsUsed === 0) return opera.title.charAt(0).toUpperCase();
    if (hintsUsed === 1) return opera.title.length;
  }

  switch (hintsUsed) {
    case 0:
      return getComposerInitials(opera.composer);
    case 1:
      return opera.title.charAt(0).toUpperCase();
    case 2:
      return opera.composer.length;
    case 3:
      return opera.title.length;
    default:
      return null;
  }
};

export const getHintButtonLabel = (hintsUsed) => {
  switch (hintsUsed) {
    case 0:
      return 'hint?';
    case 1:
      return 'another hint?';
    case 2:
      return 'one more hint?';
    case 3:
      return 'last hint?';
    case 4:
    default:
      return "that's all";
  }
};
