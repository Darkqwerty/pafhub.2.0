import { Badge } from '@mantine/core';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { useMemo } from 'react';
import { IconAdjustments, IconChevronRight, IconStar, IconTrendingUp } from '@tabler/icons-react';
import type { Game } from '../types/game';

export default function PopularGames({ games }: { games: Game[] }) {
  const columns = useMemo<MRT_ColumnDef<Game>[]>(() => [
    { accessorKey: 'title', header: 'GAME' },
    { accessorKey: 'studio', header: 'DEVELOPER' },
    { accessorKey: 'genre', header: 'GENRE' },
    { accessorKey: 'rating', header: 'RATING', Cell: ({ cell }) => <span className="rating-cell"><IconStar size={14} fill="currentColor" /> {cell.getValue<string>()}</span> },
    { accessorKey: 'status', header: 'STATUS', Cell: ({ cell }) => <Badge variant="light" color="gray" radius="sm">{cell.getValue<string>()}</Badge> },
  ], []);

  return (
    <section className="catalog-section"><div className="section-heading catalog-heading"><div><div className="section-overline"><IconTrendingUp size={14} /> THE COMMUNITY IS PLAYING</div><h2>Popular right now</h2></div><div className="table-controls"><button className="filter-button"><IconAdjustments size={16} /> Filters</button><button className="view-all">Full catalog <IconChevronRight size={16} /></button></div></div>
      <div className="table-wrap"><MantineReactTable columns={columns} data={games} enableTopToolbar={false} enableBottomToolbar={false} enableColumnActions={false} enableColumnFilters={false} enableSorting={false} enablePagination={false} enableDensityToggle={false} enableFullScreenToggle={false} enableHiding={false} mantineTableProps={{ striped: false, highlightOnHover: true }} mantinePaperProps={{ shadow: 'none' }} /></div>
    </section>
  );
}
