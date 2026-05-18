import { useMemo, useState, useEffect } from 'react';
import operas from '../data/operas.json';
import { buildSearchIndex, findBestOperaMatch } from '../utils/matching';
import {
  getYearFeedback,
  getComposerInitials,
  getComposerMasked,
  getOperaInitial,
  getOperaMasked,
  getYearRecap,
} from '../utils/game';

const minimumAutocompleteLetters = 3;
const easterEggOperaId = 'la_donna_del_lago';
const easterEggWikiUrl = 'https://it.wikipedia.org/wiki/La_donna_del_lago_(Rossini)';

// Labels indexed by hintUsed (0–4). Index 4 ("that's all") is shown — with the button disabled — as
// a reminder that all hints have been exhausted.
const hintLabels = ["Hint?", "Another hint?", "One more hint?", "One last hint?", "That's all"];

function GameBoard({ target, searchPool = operas }) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [won, setWon] = useState(false);
  const [hintUsed, setHintUsed] = useState(0);
  const attemptedOperaIds = useMemo(() => new Set(history.map((entry) => entry.id)), [history]);
  const availableOperas = useMemo(
    () => searchPool.filter((opera) => !attemptedOperaIds.has(opera.id)),
    [searchPool, attemptedOperaIds],
  );
  const filteredSearchIndex = useMemo(() => buildSearchIndex(availableOperas), [availableOperas]);
  const normalizedInput = input.trim();

  useEffect(() => {
    setInput('');
    setHistory([]);
    setWon(false);
    setHintUsed(0);
  }, [target.id]);

  const bestMatch = useMemo(() => {
    if (normalizedInput.length < minimumAutocompleteLetters) {
      return null;
    }
    return findBestOperaMatch(normalizedInput, filteredSearchIndex);
  }, [normalizedInput, filteredSearchIndex]);
  const composerUnlocked = useMemo(
    () => history.some((entry) => entry.composerCorrect),
    [history],
  );
  const languageUnlocked = useMemo(
    () => history.some((entry) => entry.languageCorrect),
    [history],
  );
  const yearRecap = useMemo(() => getYearRecap(history, target.year), [history, target.year]);

  // Hint reveal sequence (hintUsed tracks how many hints have been given):
  //   1 → composer initials in recap (e.g. "G. V.")
  //   2 → opera initial in the hint panel (e.g. "T")
  //   3 → composer name masked in recap (e.g. "G_______ V_____")
  //   4 → opera title masked in hint panel (e.g. "T_________ A_____")
  // Hints 1 and 3 are skipped when composerUnlocked (composer already guessed correctly),
  // so the next opera hint is surfaced immediately instead.
  const handleHint = () => {
    if (hintUsed >= 4) return;
    const composerHints = new Set([1, 3]);
    let next = hintUsed + 1;
    while (next <= 4 && composerHints.has(next) && composerUnlocked) {
      next++;
    }
    setHintUsed(Math.min(next, 4));
  };

  const submitGuess = (opera) => {
    setInput('');
    if (attemptedOperaIds.has(opera.id)) {
      return;
    }

    const composerCorrect = opera.composer === target.composer;
    const languageCorrect = opera.language === target.language;
    const yearFeedback = getYearFeedback(opera.year, target.year);
    const titleCorrect = opera.id === target.id;

    setHistory((prev) => [
      {
        id: opera.id,
        title: opera.title,
        composer: opera.composer,
        language: opera.language,
        year: opera.year,
        composerCorrect,
        languageCorrect,
        titleCorrect,
        yearFeedback,
      },
      ...prev,
    ]);

    if (titleCorrect) {
      setWon(true);
    }
  };

  return (
    <div className="panel game-panel">
      <div className="guess-box">
        <label htmlFor="guess-input">Opera title</label>
        <input
          id="guess-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (bestMatch) {
                submitGuess(bestMatch.opera);
              }
            }
          }}
          placeholder={`Type at least ${minimumAutocompleteLetters} letters`}
          disabled={won}
        />
        <div className="guess-actions">
          {bestMatch ? (
            <button
              className="accent-button"
              onClick={() => submitGuess(bestMatch.opera)}
              disabled={won}
            >
              Guess: {bestMatch.opera.title}
            </button>
          ) : normalizedInput.length > 0 && normalizedInput.length < minimumAutocompleteLetters ? (
            <button className="accent-button" disabled>{`Type at least ${minimumAutocompleteLetters} letters`}</button>
          ) : (
            <button className="accent-button" disabled>
              No match found
            </button>
          )}
          {history.length > 0 && !won && (
            <button
              className="secondary-button hint-button"
              onClick={handleHint}
              disabled={won || hintUsed >= 4}
            >
              {hintLabels[hintUsed]}
            </button>
          )}
        </div>
      </div>

      {won && (
        <div className="win-splash" role="status" aria-live="polite">
          <div className="confetti-layer" aria-hidden="true">
            {Array.from({ length: 24 }, (_, idx) => (
              <span
                key={idx}
                className="confetti-piece"
                style={{
                  '--left': `${(idx * 17) % 100}%`,
                  '--duration': `${2.4 + (idx % 5) * 0.22}s`,
                  '--hue': (idx * 31) % 360,
                  '--delay': `-${(idx % 7) * 0.35}s`,
                }}
              />
            ))}
          </div>
          <div className="win-panel">
            <h3>Bravissimo! You guessed it.</h3>
            <ul>
              <li>
                <strong>Title:</strong> {target.title}
              </li>
              <li>
                <strong>Composer:</strong> {target.composer}
              </li>
              <li>
                <strong>Year:</strong> {target.year}
              </li>
              <li>
                <strong>Language:</strong> {target.language}
              </li>
            </ul>
          </div>
        </div>
      )}

      <div>
        {hintUsed >= 2 && !won && (
          <div className="opera-hint-panel">
            <strong>
              {hintUsed >= 4 ? 'The Opera is called... ' + getOperaMasked(target.title) : 'The Opera title starts with... ' + getOperaInitial(target.title)}
            </strong>
          </div>
        )}
        {history.length > 0 && !won && (
          <div className="recap-box">
            <strong>Recap:</strong>
            <div className="table-wrap recap-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Composer</th>
                    <th>Language</th>
                    <th>Year</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      {composerUnlocked
                        ? target.composer
                        : hintUsed >= 3
                          ? getComposerMasked(target.composer)
                          : hintUsed >= 1
                            ? getComposerInitials(target.composer)
                            : '❓'}
                    </td>
                    <td>{languageUnlocked ? target.language : '❓'}</td>
                    <td>{yearRecap}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        <h3>Guess History</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Composer</th>
                <th>Language</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4}>No guesses yet.</td>
                </tr>
              ) : (
                history.map((entry, idx) => (
                  <tr key={`${entry.title}-${idx}`}>
                    <td>
                      <span className="guess-title-cell">
                        <span>{entry.title}</span>
                        {entry.id === easterEggOperaId && (
                          <a
                            className="lake-lady-link"
                            href={easterEggWikiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open La donna del lago on Wikipedia"
                            title="La donna del lago su Wikipedia"
                          >
                            <span className="lake-lady-icon" aria-hidden="true">
                              <span className="lake-lady-head" />
                              <span className="lake-lady-body" />
                              <span className="lake-lady-arm" />
                            </span>
                          </a>
                        )}
                      </span>
                    </td>
                    <td className={entry.composerCorrect ? 'good' : 'bad'}>
                      {entry.composer}
                    </td>
                    <td className={entry.languageCorrect ? 'good' : 'bad'}>
                      {entry.language}
                    </td>
                    <td className={entry.yearFeedback.isCorrect ? 'good' : entry.yearFeedback.isClose ? 'mid' : 'bad'}>
                      {entry.yearFeedback.symbol} {entry.year}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default GameBoard;
