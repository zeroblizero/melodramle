import { useMemo, useState, useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import operas from './data/operas.json';
import { buildSearchIndex, findBestOperaMatch } from './utils/matching';
import { filterOperas, getDailyOpera, getRandomOpera, getYearFeedback } from './utils/game';

const uniqueLanguages = [...new Set(operas.map((opera) => opera.language))].sort();
const minOperaYear = Math.min(...operas.map((opera) => opera.year));
const maxOperaYear = Math.max(...operas.map((opera) => opera.year));
const minimumAutocompleteLetters = 3;

function getYearRecap(history, targetYear) {
  if (history.length === 0) {
    return '❓';
  }

  const guessedYears = history.map((entry) => entry.year);
  if (guessedYears.length >= 2) {
    const closestLower = Math.max(...guessedYears.filter((year) => year < targetYear), -Infinity);
    const closestUpper = Math.min(...guessedYears.filter((year) => year > targetYear), Infinity);
    if (Number.isFinite(closestLower) && Number.isFinite(closestUpper)) {
      return `${closestLower}-${closestUpper}`;
    }
  }

  const closestYear = guessedYears.reduce((best, current) =>
    Math.abs(current - targetYear) < Math.abs(best - targetYear) ? current : best,
  guessedYears[0]);
  const feedback = getYearFeedback(closestYear, targetYear);
  return feedback.isCorrect ? String(closestYear) : `${feedback.symbol} ${closestYear}`;
}

function App() {
  // Determine current page for link styling and aria-labels
  const { pathname } = useLocation();
  const isPracticePage = pathname === '/practice';

  // Main app shell with header, main content area for routes, and footer
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
        <footer className="app-footer">
        <span>made with love by zeroblizero</span>
        <a href="https://github.com/zeroblizero/melodramle" target="_blank" className="footer-icon" aria-label="GitHub">
          <svg viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
        <a href="https://instagram.com/zeroblizero" target="_blank" className="footer-icon" aria-label="Instagram">
          <svg viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.057-1.645.069-4.849.069-3.204 0-3.584-.012-4.849-.069-3.259-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.265-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.322a1.44 1.44 0 11-2.881.001 1.44 1.44 0 012.881-.001z"/>
          </svg>
        </a>
      </footer>
    </div>
  );
}

// Selects the daily opera
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
  const composerUnlocked = useMemo(
    () => history.some((entry) => entry.composerCorrect),
    [history],
  );
  const languageUnlocked = useMemo(
    () => history.some((entry) => entry.languageCorrect),
    [history],
  );
  const yearRecap = useMemo(() => getYearRecap(history, target.year), [history, target.year]);

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
              submitGuess(bestMatch.opera);
            }
          }}
          placeholder={`Type at least ${minimumAutocompleteLetters} letters`}
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
          <button className="accent-button" disabled>{`Type at least ${minimumAutocompleteLetters} letters`}</button>
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
                    <td>{composerUnlocked ? target.composer : '❓'}</td>
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
