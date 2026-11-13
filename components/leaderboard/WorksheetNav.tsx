import { SiteNav, type NavItem } from '@/components/site-nav';

export default function WorksheetNav({
  sheets,
  current,
}: {
  sheets: { number: number; title: string | null }[];
  current: number | null;
}) {
  const items: NavItem[] = [
    { href: '/worksheets', label: 'Overall', active: current === null },
    ...sheets.map(s => ({
      href: `/worksheets?worksheet=${s.number}`,
      label: `Worksheet ${s.number}`,
      title: s.title ?? undefined,
      active: current === s.number,
    })),
  ];

  return (
    <div className="flex justify-center px-4 py-4">
      <SiteNav items={items} ariaLabel="Leaderboard view" />
    </div>
  );
}
