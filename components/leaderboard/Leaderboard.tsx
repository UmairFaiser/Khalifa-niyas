import FoilCard from './FoilCard';
import './Leaderboard.css';
import type { ReactNode } from 'react';
import './Leaderboard.css';

export type Player = { name: string; marks: number; rank?: number };


// Placeholder data. Later this comes from Supabase, sorted highest first.
const demoPlayers: Player[] = [
  { name: 'FIRST NAME', marks: 10 },
  { name: 'SECOND NAME', marks: 9 },
  { name: 'THIRD NAME', marks: 8 },
];

export default function Leaderboard({
  players = demoPlayers,
  nav,
  children,
}: {
  players?: Player[];
  nav?: ReactNode;
  children?: ReactNode;
}) {
  const order = [1, 0, 2] as const;

  return (
    <div className="lb-page">
      <h1 className="title-main font-serif">WORKSHEET LEADERBOARD</h1>
      {nav}

      <svg width="0" height="0" aria-hidden="true" className="card-outlines">
        <defs>
          <clipPath id="identity-outline" clipPathUnits="objectBoundingBox">
            <path
              transform="scale(.003968254 .019230769)"
              d="M6 0H207C213 0 215 3 219 7C225 13 230 13 238 13H246Q252 13 252 20V46Q252 52 246 52H6Q0 52 0 46V6Q0 0 6 0Z"
            />
          </clipPath>
          <clipPath id="caption-outline" clipPathUnits="objectBoundingBox">
            <path
              transform="scale(.004651163 .03125)"
              d="M6 0H209Q215 0 215 6V17C215 25 209 32 201 32H6Q0 32 0 26V6Q0 0 6 0Z"
            />
          </clipPath>
        </defs>
      </svg>

       <div className="stage">
        <div className="podium">
          {order.map(i => {
            const player = players[i];
            if (!player) return null;
            return (
              <FoilCard
                key={`${i}-${player.name}`}
                place={Math.min(player.rank ?? i + 1, 3) as 1 | 2 | 3}
                name={player.name}
                marks={player.marks}
              />
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}