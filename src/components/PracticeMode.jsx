import { useState } from 'react';
import { Range, getTrackBackground } from 'react-range';
import operas from '../data/operas.json';
import { filterOperas, getRandomOpera } from '../utils/game';
import GameBoard from './GameBoard';

const uniqueLanguages = [...new Set(operas.map((opera) => opera.language))].sort();
const minOperaYear = Math.min(...operas.map((opera) => opera.year));
const maxOperaYear = Math.max(...operas.map((opera) => opera.year));
const yearSliderStep = 1;

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

  // Ensures the "from" and "to" values are within valid bounds and that "from" is not greater than "to". Returns the normalized range as an array [normalizedFrom, normalizedTo].
  const normalizeYearRange = (nextFrom, nextTo) => {
    const clampedFrom = Math.min(maxOperaYear, Math.max(minOperaYear, nextFrom));
    const clampedTo = Math.min(maxOperaYear, Math.max(minOperaYear, nextTo));
    return [Math.min(clampedFrom, clampedTo), Math.max(clampedFrom, clampedTo)];
  };

  // Syncs the "from" and "to" values together, ensuring the range remains valid. If syncTextInputs is true, also updates the text inputs to match the new slider values.
  const syncYearRange = (nextFrom, nextTo, syncTextInputs = false) => {
    const [normalizedFrom, normalizedTo] = normalizeYearRange(nextFrom, nextTo);
    setSliderFrom(normalizedFrom);
    setSliderTo(normalizedTo);
    if (syncTextInputs) {
      setFrom(String(normalizedFrom));
      setTo(String(normalizedTo));
    }
  };

  // When the "from" input changes, validate and normalize the value, then update the slider and potentially sync the "to" value if the new "from" exceeds it.
  const updateFromInput = (value) => {
    setFrom(value);
    if (value === '') {
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    // If the new "from" value exceeds the current "to", sync both to the same value to avoid an invalid range
    const clampedFrom = Math.min(maxOperaYear, Math.max(minOperaYear, parsed));
    if (clampedFrom > sliderTo) {
      syncYearRange(clampedFrom, clampedFrom, true);
      return;
    }
    setSliderFrom(clampedFrom);
  };

  // When the "to" input changes, validate and normalize the value, then update the slider and potentially sync the "from" value if the new "to" is less than it.
  const updateToInput = (value) => {
    setTo(value);
    if (value === '') {
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    // If the new "to" value is less than the current "from", sync both to the same value to avoid an invalid range
    const clampedTo = Math.min(maxOperaYear, Math.max(minOperaYear, parsed));
    if (clampedTo < sliderFrom) {
      syncYearRange(clampedTo, clampedTo, true);
      return;
    }
    setSliderTo(clampedTo);
  };

  // When the slider values change, normalize them and sync the text inputs to match the new slider values.
  const updateSliderValues = (values) => {
    const [nextFrom, nextTo] = values;
    syncYearRange(nextFrom, nextTo, true);
  };

  return (
    <section>
      <div className="mode-header">
        <h2>Practice Mode</h2>
      </div>

      {!hasStarted ? (
        <div className="panel">
          <h3>Filters</h3>
          <div className="filters">
            <div className="filter-block">
              <div className="filter-block-header">
                <span>Language</span>
                <span className="language-actions">
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
                </span>
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
                <Range
                  values={[sliderFrom, sliderTo]}
                  step={yearSliderStep}
                  min={minOperaYear}
                  max={maxOperaYear}
                  onChange={updateSliderValues}
                  renderTrack={({ props, children }) => (
                    <div
                      className="year-slider-track-wrap"
                      onMouseDown={props.onMouseDown}
                      onTouchStart={props.onTouchStart}
                      style={props.style}
                    >
                      <div
                        ref={props.ref}
                        className="year-slider-track"
                        style={{
                          background: getTrackBackground({
                            values: [sliderFrom, sliderTo],
                            colors: ['#f4dfb7', '#e2b24f', '#f4dfb7'],
                            min: minOperaYear,
                            max: maxOperaYear,
                          }),
                        }}
                      >
                        {children}
                      </div>
                    </div>
                  )}
                  renderThumb={({ props, index, isDragged }) => (
                    <div
                      {...props}
                      className={`year-slider-thumb ${isDragged ? 'year-slider-thumb--dragged' : ''}`}
                      aria-label={index === 0 ? 'Minimum year' : 'Maximum year'}
                    >
                      <span className="year-slider-thumb-core" />
                    </div>
                  )}
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

export default PracticeMode;
