import { useMemo, useState, useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import operas from './data/operas.json';
import { buildSearchIndex, findBestOperaMatch } from './utils/matching';
import { filterOperas, getDailyOpera, getRandomOpera, getYearFeedback } from './utils/game';

const uniqueLanguages = [...new Set(operas.map((opera) => opera.language))].sort();
const minOperaYear = Math.min(...operas.map((opera) => opera.year));
const maxOperaYear = Math.max(...operas.map((opera) => opera.year));
const minimumAutocompleteLetters = 3;

function getGuessCloseness(guess, target) {
  let score = 0;
  if (guess.titleCorrect) {
    score += 1000;
  }
  if (guess.composerCorrect) {
    score += 200;
  }
  if (guess.languageCorrect) {
    score += 200;
  }
  score += Math.max(0, 150 - Math.abs(guess.year - target.year));
  return score;
}

function App() {
  // Determine current page for link styling and aria-labels
  const { pathname } = useLocation();
  const isPracticePage = pathname === '/practice';

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="title-container" aria-hidden="true">
          <h1>Melodramle</h1>
          <p>Guess the opera title</p>
        </span>
        <Link
          className={`mode-link ${isPracticePage ? 'mode-link--home' : 'mode-link--practice'}`}
          to={isPracticePage ? '/' : '/practice'}
          aria-label={isPracticePage ? 'Back to Opera of the Day' : 'Go to Practice Mode'}
        >
          {isPracticePage ? 'Back to Opera of the Day' : 'Go to Practice Mode'}
        </Link>
      </header>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DailyMode />} />
          <Route path="/practice" element={<PracticeMode />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function DailyMode() {
  const target = useMemo(() => getDailyOpera(operas), []);
  return (
    <section>
      <div className="mode-header">
        <h2>Opera of the Day</h2>
      </div>
      <GameBoard target={target} />
    </section>
  );
}

function PracticeMode() {
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sliderFrom, setSliderFrom] = useState(minOperaYear);
  const [sliderTo, setSliderTo] = useState(maxOperaYear);
  const [pool, setPool] = useState(operas);
  const [target, setTarget] = useState(null);

  const hasStarted = Boolean(target);

  const applyFilters = () => {
    const fromYear = from === '' ? Number.NaN : Number(from);
    const toYear = to === '' ? Number.NaN : Number(to);
    const nextPool = filterOperas(operas, {
      languages: selectedLanguages,
      fromYear,
      toYear,
    });

    setPool(nextPool);
    setTarget(nextPool.length ? getRandomOpera(nextPool) : null);
  };

  const toggleLanguage = (language) => {
    setSelectedLanguages((prev) =>
      prev.includes(language) ? prev.filter((item) => item !== language) : [...prev, language],
    );
  };

  const updateFromInput = (value) => {
    setFrom(value);
    if (value === '') {
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const clamped = Math.max(minOperaYear, Math.min(parsed, sliderTo));
    setSliderFrom(clamped);
  };

  const updateToInput = (value) => {
    setTo(value);
    if (value === '') {
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const clamped = Math.min(maxOperaYear, Math.max(parsed, sliderFrom));
    setSliderTo(clamped);
  };

  return (
    <section>
      <div className="mode-header">
        <h2>Practice Mode</h2>
      </div>

      {!hasStarted ? (
        <div className="panel">
          <h3>Filters before starting</h3>
          <div className="filters">
            <div className="filter-block">
              <p>Language</p>
              <div className="language-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setSelectedLanguages(uniqueLanguages)}
                >
                  Select all
                </button>
                <button type="button" className="secondary-button" onClick={() => setSelectedLanguages([])}>
                  Deselect all
                </button>
              </div>
              <div className="language-grid">
                {uniqueLanguages.map((language) => (
                  <label key={language}>
                    <input
                      type="checkbox"
                      checked={selectedLanguages.includes(language)}
                      onChange={() => toggleLanguage(language)}
                    />
                    {language}
                  </label>
                ))}
              </div>
            </div>
            <div className="filter-block year-row">
              <label>
                Year from
                <input type="number" value={from} onChange={(e) => updateFromInput(e.target.value)} />
              </label>
              <label>
                Year to
                <input type="number" value={to} onChange={(e) => updateToInput(e.target.value)} />
              </label>
            </div>
            <div className="filter-block">
              <p>Year range slider</p>
              <div className="year-slider">
                <input
                  type="range"
                  min={minOperaYear}
                  max={maxOperaYear}
                  value={sliderFrom}
                  aria-label="Minimum year"
                  onChange={(e) => {
                    const value = Math.min(Number(e.target.value), sliderTo);
                    setSliderFrom(value);
                    setFrom(String(value));
                  }}
                />
                <input
                  type="range"
                  min={minOperaYear}
                  max={maxOperaYear}
                  value={sliderTo}
                  aria-label="Maximum year"
                  onChange={(e) => {
                    const value = Math.max(Number(e.target.value), sliderFrom);
                    setSliderTo(value);
                    setTo(String(value));
                  }}
                />
              </div>
            </div>
          </div>
          <button className="accent-button" onClick={applyFilters}>
            Start Practice Round
          </button>
          {pool.length === 0 && (
            <p className="empty-pool">No operas match these filters. Adjust and try again.</p>
          )}
        </div>
      ) : (
        <>
          <div className="practice-actions">
            <button className="secondary-button" onClick={() => setTarget(getRandomOpera(pool))}>
              New Random Round
            </button>
            <button className="secondary-button" onClick={() => setTarget(null)}>
              Change Filters
            </button>
          </div>
          <GameBoard target={target} searchPool={pool} />
        </>
      )}
    </section>
  );
}

function GameBoard({ target, searchPool = operas }) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [won, setWon] = useState(false);
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
  }, [target.id]);

  const bestMatch = useMemo(() => {
    if (normalizedInput.length < minimumAutocompleteLetters) {
      return null;
    }
    return findBestOperaMatch(normalizedInput, filteredSearchIndex);
  }, [normalizedInput, filteredSearchIndex]);
  const recap = useMemo(
    () =>
      [...history]
        .sort((a, b) => getGuessCloseness(b, target) - getGuessCloseness(a, target))
        .slice(0, 3),
    [history, target],
  );

  const submitGuess = (opera) => {
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

    setInput('');
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
            }
          }}
          placeholder="Type at least 3 letters"
          disabled={won}
        />
        {bestMatch ? (
          <button
            className="accent-button"
            onClick={() => submitGuess(bestMatch.opera)}
            disabled={won}
          >
            Guess: {bestMatch.opera.title}
          </button>
        ) : normalizedInput.length > 0 && normalizedInput.length < minimumAutocompleteLetters ? (
          <button className="accent-button" disabled>
            Type at least 3 letters
          </button>
        ) : (
          <button className="accent-button" disabled>
            No match found
          </button>
        )}
      </div>

      {won && (
        <div className="win-splash" role="status" aria-live="polite">
          <div className="confetti-layer" aria-hidden="true">
            {Array.from({ length: 24 }, (_, idx) => (
              <span key={idx} className="confetti-piece" style={{ '--i': idx }} />
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
        <h3>Guess History</h3>
        {history.length > 0 && (
          <div className="recap-box">
            <strong>Recap closest guesses:</strong>
            <ul>
              {recap.map((entry) => (
                <li key={`recap-${entry.id}`}>
                  {entry.title} · {entry.composer} ({entry.year})
                </li>
              ))}
            </ul>
          </div>
        )}
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
                    <td>{entry.title}</td>
                    <td className={entry.composerCorrect ? 'good' : 'bad'}>
                      {entry.composerCorrect ? '✅' : `❌ ${entry.composer}`}
                    </td>
                    <td className={entry.languageCorrect ? 'good' : 'bad'}>
                      {entry.languageCorrect ? '✅' : `❌ ${entry.language}`}
                    </td>
                    <td className={entry.yearFeedback.isCorrect ? 'good' : 'bad'}>
                      {entry.yearFeedback.isCorrect ? '✅' : `${entry.yearFeedback.symbol} ${entry.year}`}
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

export default App;
