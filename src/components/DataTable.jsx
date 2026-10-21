import { useMemo, useState } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState, TableSkeleton } from './Feedback';

/**
 * columns: [{ key, label, render?(row), sortable?, sortValue?(row) }]
 * Search, sort and pagination are client-side; filter `rows` upstream for server/select filters.
 */
export default function DataTable({
  columns, rows = [], loading = false, pageSize = 8, searchable = true, searchKeys, toolbar, onRowClick,
  emptyTitle = 'Nothing here yet', emptyText = 'No records match your filters.', rowKey = 'id', searchPlaceholder = 'Search…',
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(null);
  const [page, setPage] = useState(1);

  const data = useMemo(() => {
    let d = rows;
    if (q.trim()) {
      const s = q.toLowerCase();
      const keys = searchKeys || columns.map((c) => c.key);
      d = d.filter((r) => keys.some((k) => String(r[k] ?? '').toLowerCase().includes(s)));
    }
    if (sort) {
      const c = columns.find((x) => x.key === sort.key);
      const gv = (r) => (c?.sortValue ? c.sortValue(r) : r[sort.key]);
      d = [...d].sort((a, b) => {
        const x = gv(a), y = gv(b);
        const cmp = x > y ? 1 : x < y ? -1 : 0;
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, sort]);

  const pages = Math.max(1, Math.ceil(data.length / pageSize));
  const cur = Math.min(page, pages);
  const slice = data.slice((cur - 1) * pageSize, cur * pageSize);
  const toggleSort = (key) => setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));

  return (
    <div className="card overflow-hidden">
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-red-100 p-3">
          {searchable && (
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-700" aria-hidden="true" />
              <input className="input pl-9" placeholder={searchPlaceholder} aria-label="Search table" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </div>
          )}
          {toolbar}
        </div>
      )}
      {loading ? (
        <TableSkeleton />
      ) : slice.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyText} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="th" scope="col" aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.sortable === false ? (
                      c.label
                    ) : (
                      <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-red-700">
                        {c.label}
                        {sort?.key === c.key && (sort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((r, i) => (
                <tr
                  key={r[rowKey] ?? i}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={`border-t border-red-100 ${onRowClick ? 'cursor-pointer hover:bg-red-50' : ''}`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className="td">
                      {c.render ? c.render(r) : r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && data.length > pageSize && (
        <div className="flex items-center justify-between border-t border-red-100 px-4 py-3 text-sm">
          <span className="muted">
            {(cur - 1) * pageSize + 1}–{Math.min(cur * pageSize, data.length)} of {data.length}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" className="btn-outline btn-sm" disabled={cur <= 1} onClick={() => setPage(cur - 1)} aria-label="Previous page">
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-semibold">
              {cur} / {pages}
            </span>
            <button type="button" className="btn-outline btn-sm" disabled={cur >= pages} onClick={() => setPage(cur + 1)} aria-label="Next page">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
