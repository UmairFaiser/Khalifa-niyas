import Link from 'next/link';

export default function WorksheetNav({
  sheets,
  current,
}: {
  sheets: { number: number; title: string | null }[];
  current: number | null;
}) {
  return (
    <nav className="lbt-nav" aria-label="Leaderboard view">
      <Link href="/worksheets" className={current === null ? 'active' : ''}>
        Overall
      </Link>
      {sheets.map(s => (
        <Link
          key={s.number}
          href={`/worksheets?worksheet=${s.number}`}
          title={s.title ?? undefined}
          className={current === s.number ? 'active' : ''}
        >
          Worksheet {s.number}
        </Link>
      ))}
    </nav>
  );
}