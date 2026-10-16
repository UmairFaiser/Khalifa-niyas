import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import Leaderboard, { type Player } from '@/components/leaderboard/Leaderboard';
import WorksheetNav from '@/components/leaderboard/WorksheetNav';
import LeaderboardTable, { type Row } from '@/components/leaderboard/LeaderboardTable';

type Sheet = { number: number; title: string | null; submission_count: number };

export default async function WorksheetLeaderboard({
  searchParams,
}: {
  // Next 15 passes a Promise. On Next 14, drop the Promise and the await.
  searchParams: Promise<{ worksheet?: string }>;
}) {
  const { worksheet } = await searchParams;
  const supabase = createClient(await cookies());

  const { data: sheetData } = await supabase.rpc('list_worksheets');
  const sheets = ((sheetData ?? []) as Sheet[]).sort((a, b) => a.number - b.number);

  const requested = Number(worksheet);
  const current = sheets.find(s => s.number === requested)?.number ?? null; // null = overall

  let rows: Row[] = [];
  let podiumSource: Row[] = [];

  if (current === null) {
    const { data } = await supabase.rpc('overall_leaderboard');
    rows = ((data ?? []) as any[])
      .map(r => ({
        id: r.student_id,
        rank: Number(r.rank),
        name: r.name,
        institute: r.institute,
        value: Number(r.total_points),
        change: r.rank_change == null ? null : Number(r.rank_change),
        dim: Number(r.total_points) === 0,
        note: `${r.worksheets_done} worksheet${r.worksheets_done === 1 ? '' : 's'}`,
      }))
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
    podiumSource = rows.filter(r => (r.value ?? 0) > 0);
  } else {
    const [{ data }, prev] = await Promise.all([
      supabase.rpc('worksheet_leaderboard', { ws_number: current }),
      sheets.some(s => s.number === current - 1)
        ? supabase.rpc('worksheet_leaderboard', { ws_number: current - 1 })
        : Promise.resolve({ data: null }),
    ]);

    // Previous worksheet's rank per student, to compute movement.
    const prevRank = new Map<string, number>(
      ((prev.data ?? []) as any[]).map(r => [r.student_id, Number(r.rank)]),
    );

    rows = ((data ?? []) as any[])
      .map(r => {
        const before = prevRank.get(r.student_id);
        return {
          id: r.student_id,
          rank: Number(r.rank),
          name: r.name,
          institute: r.institute,
          value: r.display_marks == null ? null : Number(r.display_marks),
          change: before == null ? null : before - Number(r.rank), // positive = moved up
        };
      })
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
    podiumSource = rows.filter(r => r.value !== null);
  }

  const top = podiumSource.slice(0, 3);
  const players: Player[] = top.map(r => ({ name: r.name, marks: r.value ?? 0, rank: r.rank }));
  const topIds = new Set(top.map(r => r.id));
  const tableRows = rows.filter(r => !topIds.has(r.id));

  return (
    <main>
      <Leaderboard
        players={players}
        nav={<WorksheetNav sheets={sheets} current={current} />}
      >
        <LeaderboardTable
          rows={tableRows}
          valueLabel={current === null ? 'Points' : 'Marks'}
        />
      </Leaderboard>
    </main>
  );
}