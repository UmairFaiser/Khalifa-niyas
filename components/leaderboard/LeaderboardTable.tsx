export type Row = {
  id: string;
  rank: number;
  name: string;
  institute: string;
  value: number | null; // null = hidden
  change: number | null; // positive = moved up
  dim?: boolean;
  note?: string;
};

// Set to true to hide overall totals (see the "marks leak" note below).
const HIDE_TOTALS = false;

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function Move({ change }: { change: number | null }) {
  if (change === null || change === 0) return <span className="lbt-flat">–</span>;
  return change > 0 ? (
    <span className="lbt-up" aria-label={`Up ${change}`}> ▲ {change}</span>
  ) : (
    <span className="lbt-down" aria-label={`Down ${Math.abs(change)}`}>▼ {Math.abs(change)}</span>
  );
}

export default function LeaderboardTable({
  rows,
  valueLabel,
}: {
  rows: Row[];
  valueLabel: string;
}) {
  if (rows.length === 0) return null;
  const hideValues = HIDE_TOTALS && valueLabel === 'Points';

  return (
    <section className="lbt-wrap">
      <table className="lbt">
        <thead>
          <tr>
            <th>#</th>
            <th>Student</th>
            <th className="lbt-inst">Institute</th>
            <th className="lbt-num">{valueLabel}</th>
            <th className="lbt-num">Move</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className={r.dim ? 'dim' : undefined}>
              <td className="lbt-rank">{r.rank}</td>
              <td>
                <div className="lbt-name">{r.name}</div>
                {r.note && <div className="lbt-note">{r.note}</div>}
              </td>
              <td className="lbt-inst">{r.institute}</td>
              <td className="lbt-num">
                {r.value === null || hideValues ? '—' : fmt(r.value)}
              </td>
              <td className="lbt-num">{r.dim ? '–' : <Move change={r.change} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}