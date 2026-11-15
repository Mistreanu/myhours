import { ColorDot, TagBadge } from '@/components/color-dot';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FilterSelect } from '@/components/filter-select';
import { TimeEntryForm } from '@/components/time-entry-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { addDays, formatDate, formatDuration, formatHours, formatMoney, formatMonth, parseDate, timeOf, toDateString } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type ClientOption, type ProjectOption, type RateOption, type TagOption, type TimeEntry } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { Briefcase, Building2, ChevronLeft, ChevronRight, Clock, Coins, Download, FileSpreadsheet, Pencil, Search, Tag, Trash2, Wallet, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

interface Filters {
    from: string | null;
    to: string | null;
    clients: number[];
    projects: number[];
    rates: number[];
    tags: number[];
    search: string | null;
}

interface Props {
    filters: Filters;
    entries: TimeEntry[];
    totals: { count: number; minutes: number; amount: number };
    byProject: { id: number; name: string; color: string; client: string | null; minutes: number; amount: number }[];
    byRate: { id: number | null; name: string; minutes: number; amount: number }[];
    options: { clients: ClientOption[]; projects: ProjectOption[]; rates: RateOption[]; tags: TagOption[] };
}

type Preset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom';

const PRESET_LABELS: Record<Preset, string> = {
    this_week: 'This week',
    last_week: 'Last week',
    this_month: 'This month',
    last_month: 'Last month',
    this_year: 'This year',
    all: 'All time',
    custom: 'Custom range',
};

export default function Detailed({ filters, entries, totals, byProject, byRate, options }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [editing, setEditing] = useState<TimeEntry | null>(null);
    const [deleting, setDeleting] = useState<TimeEntry | null>(null);

    const preset = detectPreset(filters.from, filters.to);

    const apply = (changes: Partial<Filters> & { all?: boolean }) => {
        const next = { ...filters, ...changes };
        const params: Record<string, unknown> = {
            from: next.from ?? undefined,
            to: next.to ?? undefined,
            clients: next.clients.length ? next.clients : undefined,
            projects: next.projects.length ? next.projects : undefined,
            rates: next.rates.length ? next.rates : undefined,
            tags: next.tags.length ? next.tags : undefined,
            search: next.search || undefined,
        };
        if (!next.from && !next.to) params.all = 1;
        router.get(route('reports.detailed'), params as never, { preserveState: true, preserveScroll: true, replace: true });
    };

    // Debounce the free-text search.
    const firstRender = useRef(true);
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        const t = setTimeout(() => {
            if ((filters.search ?? '') !== search) apply({ search: search || null });
        }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const exportUrl = useMemo(() => {
        const params: Record<string, unknown> = {
            from: filters.from ?? undefined,
            to: filters.to ?? undefined,
            clients: filters.clients.length ? filters.clients : undefined,
            projects: filters.projects.length ? filters.projects : undefined,
            rates: filters.rates.length ? filters.rates : undefined,
            tags: filters.tags.length ? filters.tags : undefined,
            search: filters.search || undefined,
        };
        if (!filters.from && !filters.to) params.all = 1;
        return route('reports.export', params as never);
    }, [filters]);

    const shift = (direction: -1 | 1) => {
        if (!filters.from || !filters.to) return;
        apply(shiftRange(filters.from, filters.to, preset, direction));
    };

    const hasFilters = filters.clients.length > 0 || filters.projects.length > 0 || filters.rates.length > 0 || filters.tags.length > 0 || !!filters.search;

    // Group rows by month, like the reference "View: Months".
    const months = useMemo(() => {
        const groups: { key: string; entries: TimeEntry[]; minutes: number; amount: number }[] = [];
        for (const e of entries) {
            const key = e.started_at.slice(0, 7);
            let g = groups.at(-1);
            if (!g || g.key !== key) {
                g = { key, entries: [], minutes: 0, amount: 0 };
                groups.push(g);
            }
            g.entries.push(e);
            g.minutes += e.duration_minutes;
            g.amount += e.amount;
        }
        return groups;
    }, [entries]);

    const destroy = () => {
        if (!deleting) return;
        router.delete(route('time-entries.destroy', deleting.id), { preserveScroll: true, onFinish: () => setDeleting(null) });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Detailed report', href: route('reports.detailed') }]}>
            <Head title="Detailed report" />

            <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Detailed report</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Every time entry in the selected period, with totals and Excel export.</p>
                    </div>
                    <Button asChild>
                        <a href={exportUrl}>
                            <Download />
                            Export to Excel
                        </a>
                    </Button>
                </div>

                {/* Period */}
                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={preset}
                        onValueChange={(v) => {
                            const range = presetRange(v as Preset);
                            if (range) apply(range);
                        }}
                    >
                        <SelectTrigger className="h-9 w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.keys(PRESET_LABELS) as Preset[])
                                .filter((p) => p !== 'custom' || preset === 'custom')
                                .map((p) => (
                                    <SelectItem key={p} value={p}>
                                        {PRESET_LABELS[p]}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>

                    <div className="bg-card flex items-center rounded-lg border shadow-xs">
                        <Button variant="ghost" size="icon" className="size-9 rounded-r-none" onClick={() => shift(-1)} disabled={!filters.from || !filters.to} aria-label="Previous period">
                            <ChevronLeft />
                        </Button>
                        <input
                            type="date"
                            value={filters.from ?? ''}
                            onChange={(e) => e.target.value && apply({ from: e.target.value, to: filters.to ?? e.target.value })}
                            className="h-9 border-l bg-transparent px-2 text-sm outline-none"
                            aria-label="From"
                        />
                        <span className="text-muted-foreground px-1">→</span>
                        <input
                            type="date"
                            value={filters.to ?? ''}
                            onChange={(e) => e.target.value && apply({ to: e.target.value, from: filters.from ?? e.target.value })}
                            className="h-9 border-r bg-transparent px-2 text-sm outline-none"
                            aria-label="To"
                        />
                        <Button variant="ghost" size="icon" className="size-9 rounded-l-none" onClick={() => shift(1)} disabled={!filters.from || !filters.to} aria-label="Next period">
                            <ChevronRight />
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground mr-1 text-xs font-semibold tracking-wide uppercase">Filters</span>
                    <FilterSelect
                        label="Clients"
                        icon={Building2}
                        options={options.clients.map((c) => ({ id: c.id, label: c.name }))}
                        selected={filters.clients}
                        onChange={(ids) => apply({ clients: ids })}
                    />
                    <FilterSelect
                        label="Projects"
                        icon={Briefcase}
                        options={options.projects.map((p) => ({ id: p.id, label: p.name, sublabel: p.client, color: p.color }))}
                        selected={filters.projects}
                        onChange={(ids) => apply({ projects: ids })}
                    />
                    <FilterSelect
                        label="Rates"
                        icon={Coins}
                        options={options.rates.map((r) => ({ id: r.id, label: r.name, sublabel: `${formatMoney(r.hourly_rate)}/h` }))}
                        selected={filters.rates}
                        onChange={(ids) => apply({ rates: ids })}
                    />
                    <FilterSelect
                        label="Tags"
                        icon={Tag}
                        options={options.tags.map((t) => ({ id: t.id, label: t.name, color: t.color }))}
                        selected={filters.tags}
                        onChange={(ids) => apply({ tags: ids })}
                    />
                    <div className="relative">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description…" className="h-9 w-56 rounded-full pl-9" />
                    </div>
                    {hasFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearch('');
                                apply({ clients: [], projects: [], rates: [], tags: [], search: null });
                            }}
                        >
                            <X />
                            Clear filters
                        </Button>
                    )}
                </div>

                {/* Totals */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard icon={Clock} label="Total hours" value={formatDuration(totals.minutes)} hint={`${formatHours(totals.minutes)} h`} />
                    <StatCard icon={Wallet} label="Total amount" value={formatMoney(totals.amount)} accent />
                    <StatCard icon={FileSpreadsheet} label="Time entries" value={String(totals.count)} hint={periodLabel(filters.from, filters.to)} />
                </div>

                {/* Breakdowns */}
                {entries.length > 0 && (
                    <div className="grid gap-4 xl:grid-cols-2">
                        <Breakdown
                            title="By project"
                            rows={byProject.map((p) => ({ key: `p${p.id}`, label: p.name, sublabel: p.client, color: p.color, minutes: p.minutes, amount: p.amount }))}
                            measure="minutes"
                        />
                        <Breakdown
                            title="By rate"
                            rows={byRate.map((r) => ({ key: `r${r.id ?? 0}`, label: r.name, sublabel: null, color: 'var(--primary)', minutes: r.minutes, amount: r.amount }))}
                            measure="amount"
                        />
                    </div>
                )}

                {/* Table */}
                <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-sm">
                            <thead>
                                <tr className="text-muted-foreground border-b text-left text-xs font-semibold tracking-wide uppercase">
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Client</th>
                                    <th className="px-4 py-3">Project</th>
                                    <th className="px-4 py-3">Tags</th>
                                    <th className="px-4 py-3">Time</th>
                                    <th className="px-4 py-3 text-right">Hours</th>
                                    <th className="px-4 py-3 text-right">Rate</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="w-20 px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {months.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="text-muted-foreground px-4 py-16 text-center">
                                            No time entries match these filters.
                                        </td>
                                    </tr>
                                )}
                                {months.map((m) => (
                                    <Fragment key={m.key}>
                                        <tr className="bg-muted/60 border-b">
                                            <td colSpan={5} className="px-4 py-2 font-semibold">
                                                {formatMonth(`${m.key}-01`)}
                                            </td>
                                            <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatDuration(m.minutes)}</td>
                                            <td />
                                            <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatMoney(m.amount)}</td>
                                            <td />
                                        </tr>
                                        {m.entries.map((e) => (
                                            <Fragment key={e.id}>
                                                <tr className={cn('group', e.description ? '' : 'border-b')}>
                                                    <td className="px-4 pt-3 pb-1 whitespace-nowrap">{formatDate(e.started_at)}</td>
                                                    <td className="text-muted-foreground px-4 pt-3 pb-1">{e.project.client ?? '—'}</td>
                                                    <td className="px-4 pt-3 pb-1">
                                                        <span className="flex items-center gap-2 font-medium">
                                                            <ColorDot color={e.project.color} />
                                                            {e.project.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 pt-3 pb-1">
                                                        {e.tags.length ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {e.tags.map((t) => (
                                                                    <TagBadge key={t.id} name={t.name} color={t.color} />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground/60 text-xs">no tag</span>
                                                        )}
                                                    </td>
                                                    <td className="text-muted-foreground px-4 pt-3 pb-1 whitespace-nowrap tabular-nums">
                                                        {timeOf(e.started_at)} – {timeOf(e.ended_at)}
                                                    </td>
                                                    <td className="px-4 pt-3 pb-1 text-right font-medium tabular-nums">{formatDuration(e.duration_minutes)}</td>
                                                    <td className="px-4 pt-3 pb-1 text-right whitespace-nowrap">
                                                        <div>{e.rate?.name ?? <span className="text-muted-foreground/60 text-xs">no rate</span>}</div>
                                                        <div className="text-muted-foreground text-xs tabular-nums">{formatMoney(e.hourly_rate)}/h</div>
                                                    </td>
                                                    <td className="px-4 pt-3 pb-1 text-right font-medium whitespace-nowrap tabular-nums">{formatMoney(e.amount)}</td>
                                                    <td className="px-4 pt-2 pb-1">
                                                        <div className="flex justify-end gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                                                            <Button variant="ghost" size="icon" className="size-8" aria-label="Edit" onClick={() => setEditing(e)}>
                                                                <Pencil />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="hover:text-destructive size-8" aria-label="Delete" onClick={() => setDeleting(e)}>
                                                                <Trash2 />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {e.description && (
                                                    <tr className="border-b">
                                                        <td />
                                                        <td colSpan={8} className="text-muted-foreground px-4 pt-0 pb-3 whitespace-pre-line">
                                                            {e.description}
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        ))}
                                    </Fragment>
                                ))}
                            </tbody>
                            {entries.length > 0 && (
                                <tfoot>
                                    <tr className="bg-primary/5 font-semibold">
                                        <td colSpan={5} className="px-4 py-3">
                                            Total
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">{formatDuration(totals.minutes)}</td>
                                        <td />
                                        <td className="text-primary px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatMoney(totals.amount)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>

            <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Edit time entry</DialogTitle>
                    </DialogHeader>
                    {editing && (
                        <TimeEntryForm
                            bare
                            projects={options.projects}
                            rates={options.rates}
                            tags={options.tags}
                            entry={editing}
                            onDone={() => setEditing(null)}
                            onCancel={() => setEditing(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => !o && setDeleting(null)}
                title="Delete time entry?"
                description={deleting ? `${deleting.project.name}, ${formatDate(deleting.started_at)} ${timeOf(deleting.started_at)}–${timeOf(deleting.ended_at)}. This cannot be undone.` : ''}
                onConfirm={destroy}
            />
        </AppLayout>
    );
}

function StatCard({ icon: Icon, label, value, hint, accent }: { icon: typeof Clock; label: string; value: string; hint?: string; accent?: boolean }) {
    return (
        <div className={cn('bg-card rounded-xl border p-5 shadow-xs', accent && 'border-primary/30 bg-primary/5')}>
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                <Icon className="size-4" />
                {label}
            </div>
            <div className={cn('mt-2 text-2xl font-bold tabular-nums', accent && 'text-primary')}>{value}</div>
            {hint && <div className="text-muted-foreground mt-0.5 text-xs">{hint}</div>}
        </div>
    );
}

interface BreakdownRow {
    key: string;
    label: string;
    sublabel: string | null;
    color: string;
    minutes: number;
    amount: number;
}

/** Horizontal bar list; bars are scaled by hours or by amount. */
function Breakdown({ title, rows, measure }: { title: string; rows: BreakdownRow[]; measure: 'minutes' | 'amount' }) {
    const max = Math.max(1, ...rows.map((r) => r[measure]));

    return (
        <div className="bg-card rounded-xl border p-5 shadow-xs">
            <h2 className="mb-4 text-sm font-semibold">{title}</h2>
            <div className="space-y-3">
                {rows.map((r) => (
                    <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 text-sm sm:grid-cols-[minmax(0,12rem)_1fr_auto]">
                        <div className="flex min-w-0 items-center gap-2">
                            <ColorDot color={r.color} />
                            <span className="truncate font-medium">{r.label}</span>
                            {r.sublabel && <span className="text-muted-foreground truncate text-xs">{r.sublabel}</span>}
                        </div>
                        <div className="bg-muted order-last col-span-2 h-2 overflow-hidden rounded-full sm:order-none sm:col-span-1">
                            <div className="h-full rounded-full" style={{ width: `${(r[measure] / max) * 100}%`, backgroundColor: r.color }} />
                        </div>
                        <div className="text-right whitespace-nowrap tabular-nums">
                            <span className="font-semibold">{formatDuration(r.minutes)}</span>
                            <span className="text-muted-foreground ml-3">{formatMoney(r.amount)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function periodLabel(from: string | null, to: string | null): string {
    if (!from && !to) return 'All time';
    const fmt = (d: string) => formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${from ? fmt(from) : '…'} – ${to ? fmt(to) : '…'}`;
}

function startOfWeek(d: Date): Date {
    const r = new Date(d);
    r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); // Monday
    return r;
}

function presetRange(preset: Preset): { from: string | null; to: string | null } | null {
    const now = new Date();
    switch (preset) {
        case 'this_week': {
            const s = startOfWeek(now);
            return { from: toDateString(s), to: addDays(toDateString(s), 6) };
        }
        case 'last_week': {
            const s = startOfWeek(now);
            s.setDate(s.getDate() - 7);
            return { from: toDateString(s), to: addDays(toDateString(s), 6) };
        }
        case 'this_month':
            return { from: toDateString(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
        case 'last_month':
            return { from: toDateString(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: toDateString(new Date(now.getFullYear(), now.getMonth(), 0)) };
        case 'this_year':
            return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
        case 'all':
            return { from: null, to: null };
        default:
            return null;
    }
}

function detectPreset(from: string | null, to: string | null): Preset {
    for (const p of ['this_week', 'last_week', 'this_month', 'last_month', 'this_year', 'all'] as Preset[]) {
        const r = presetRange(p);
        if (r && r.from === from && r.to === to) return p;
    }
    return 'custom';
}

/** Move the range one period back or forward, keeping its shape (week, month, year or N days). */
function shiftRange(from: string, to: string, preset: Preset, dir: -1 | 1): { from: string; to: string } {
    const f = parseDate(from);
    const t = parseDate(to);
    const isWholeMonth = f.getDate() === 1 && new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate() === t.getDate() && f.getMonth() === t.getMonth();
    const isWholeYear = preset === 'this_year' || (from.endsWith('-01-01') && to.endsWith('-12-31') && f.getFullYear() === t.getFullYear());

    if (isWholeYear) {
        const y = f.getFullYear() + dir;
        return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    if (isWholeMonth) {
        const start = new Date(f.getFullYear(), f.getMonth() + dir, 1);
        return { from: toDateString(start), to: toDateString(new Date(start.getFullYear(), start.getMonth() + 1, 0)) };
    }
    const days = Math.round((t.getTime() - f.getTime()) / 86_400_000) + 1;
    return { from: addDays(from, dir * days), to: addDays(to, dir * days) };
}
