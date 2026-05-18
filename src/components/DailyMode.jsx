import { useMemo } from 'react';
import operas from '../data/operas.json';
import { getDailyOpera } from '../utils/game';
import GameBoard from './GameBoard';

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

export default DailyMode;
