import { TagBadge } from '@/components/color-dot';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { TimeEntryForm } from '@/components/time-entry-form';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { addDays, formatDate, formatDuration, formatMoney, nowTime, parseDate, timeOf } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type ProjectOption, type TagOption, type TimeEntry } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Home, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

interface Props {
    date: string;
    today: string;
    entries: TimeEntry[];
    totals: { minutes: number; amount: number };
    week: { date: string; minutes: number }[];
    projects: ProjectOption[];
    tags: TagOption[];
}

export default function Track({ date, today, entries, totals, week, projects, tags }: Props) {
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<TimeEntry | null>(null);
    const [lastProjectId, setLastProjectId] = useState<number | null>(entries.at(-1)?.project.id ?? null);
    const dateInput = useRef<HTMLInputElement>(null);

    const goTo = (d: string) => {
        setAdding(false);
        setEditingId(null);
        router.get(route('track'), d === today ? {} : { date: d }, { preserveState: true, preserveScroll: true });
    };

    // New entries continue where the last one of the day ended.
    const lastEnd = entries.length ? timeOf(entries[entries.length - 1].ended_at) : null;
    const defaultStart = lastEnd ?? (date === today ? roundDownToQuarter(nowTime()) : '09:00');
    const defaults = { date, start: defaultStart, end: addHour(defaultStart), projectId: lastProjectId };

    const destroy = () => {
        if (!deleting) return;
        router.delete(route('time-entries.destroy', deleting.id), { preserveScroll: true, onFinish: () => setDeleting(null) });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Track', href: route('track') }]}>
            <Head title="Track" />

            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Track</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Log what you worked on, when, and for which project.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Day total</div>
                        <div className="text-2xl font-semibold tabular-nums">{formatDuration(totals.minutes)}</div>
                        <div className="text-primary text-sm font-medium tabular-nums">{formatMoney(totals.amount)}</div>
                    </div>
                </div>

                {/* Day navigation */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-card flex items-center rounded-lg border shadow-xs">
                        <Button variant="ghost" size="icon" className="size-9 rounded-r-none" onClick={() => goTo(addDays(date, -1))} aria-label="Previous day">
                            <ChevronLeft />
                        </Button>
                        <button
                            type="button"
                            className="hover:bg-accent relative flex h-9 min-w-48 items-center justify-center gap-2 border-x px-3 text-sm font-medium"
                            onClick={() => dateInput.current?.showPicker?.()}
                        >
                            <CalendarDays className="text-muted-foreground size-4" />
                            {formatDate(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            {date === today && <span className="text-primary">(Today)</span>}
                            <input
                                ref={dateInput}
                                type="date"
                                value={date}
                                onChange={(e) => e.target.value && goTo(e.target.value)}
                                className="pointer-events-none absolute inset-0 opacity-0"
                                tabIndex={-1}
                                aria-hidden
                            />
                        </button>
                        <Button variant="ghost" size="icon" className="size-9 rounded-l-none" onClick={() => goTo(addDays(date, 1))} aria-label="Next day">
                            <ChevronRight />
                        </Button>
                    </div>
                    {date !== today && (
                        <Button variant="outline" size="sm" onClick={() => goTo(today)}>
                            <Home />
                            Today
                        </Button>
                    )}
                    <Button
                        className="ml-auto"
                        onClick={() => {
                            setEditingId(null);
                            setAdding(true);
                        }}
                        disabled={adding}
                    >
                        <Plus />
                        Add time entry
                    </Button>
                </div>

                {/* Week strip */}
                <div className="grid grid-cols-7 gap-1.5">
                    {week.map((d) => {
                        const selected = d.date === date;
                        const day = parseDate(d.date);
                        return (
                            <button
                                key={d.date}
                                type="button"
                                onClick={() => goTo(d.date)}
                                className={cn(
                                    'flex flex-col items-center rounded-lg border px-1 py-2 text-xs transition-colors',
                                    selected ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:bg-accent',
                                )}
                            >
                                <span className="font-medium uppercase">{day.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                                <span className={cn('text-muted-foreground', selected && 'text-primary', d.date === today && 'font-bold')}>
                                    {day.getDate()}
                                </span>
                                <span className={cn('mt-1 font-semibold tabular-nums', d.minutes === 0 && 'text-muted-foreground/50 font-normal')}>
                                    {formatDuration(d.minutes)}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {adding && (
                    <TimeEntryForm
                        key={`new-${date}-${entries.length}`}
                        projects={projects}
                        tags={tags}
                        defaults={defaults}
                        onDone={({ projectId }) => {
                            setLastProjectId(projectId);
                            setAdding(false);
                        }}
                        onCancel={() => setAdding(false)}
                    />
                )}

                {/* Entries */}
                {entries.length === 0 && !adding ? (
                    <div className="bg-card flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
                        <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-full">
                            <Clock className="size-6" />
                        </div>
                        <h3 className="font-semibold">No time tracked on this day</h3>
                        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                            {projects.length === 0 ? (
                                <>
                                    Start by creating a <Link href={route('projects.index')} className="text-primary underline-offset-4 hover:underline">project</Link> with its hourly rate.
                                </>
                            ) : (
                                'Add a time entry with the start and end time, the project and a short description.'
                            )}
                        </p>
                        {projects.length > 0 && (
                            <Button className="mt-5" onClick={() => setAdding(true)}>
                                <Plus />
                                Add time entry
                            </Button>
                        )}
                    </div>
                ) : (
                    entries.length > 0 && (
                        <div className="bg-card divide-y overflow-hidden rounded-xl border shadow-xs">
                            {entries.map((entry) =>
                                editingId === entry.id ? (
                                    <div key={entry.id} className="bg-muted/30 p-4">
                                        <TimeEntryForm
                                            projects={projects}
                                            tags={tags}
                                            entry={entry}
                                            onDone={() => setEditingId(null)}
                                            onCancel={() => setEditingId(null)}
                                        />
                                    </div>
                                ) : (
                                    <EntryRow
                                        key={entry.id}
                                        entry={entry}
                                        onEdit={() => {
                                            setAdding(false);
                                            setEditingId(entry.id);
                                        }}
                                        onDelete={() => setDeleting(entry)}
                                    />
                                ),
                            )}
                            <div className="bg-muted/40 flex items-center justify-end gap-6 px-5 py-3 text-sm">
                                <span className="text-muted-foreground">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
                                <span className="font-semibold tabular-nums">Total: {formatDuration(totals.minutes)}</span>
                                <span className="text-primary font-semibold tabular-nums">{formatMoney(totals.amount)}</span>
                            </div>
                        </div>
                    )
                )}
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => !o && setDeleting(null)}
                title="Delete time entry?"
                description={deleting ? `${deleting.project.name}, ${timeOf(deleting.started_at)}–${timeOf(deleting.ended_at)}. This cannot be undone.` : ''}
                onConfirm={destroy}
            />
        </AppLayout>
    );
}

function EntryRow({ entry, onEdit, onDelete }: { entry: TimeEntry; onEdit: () => void; onDelete: () => void }) {
    const nextDay = entry.ended_at.slice(0, 10) !== entry.started_at.slice(0, 10);

    return (
        <div className="group hover:bg-muted/40 relative flex cursor-pointer gap-4 px-5 py-4 transition-colors" onClick={onEdit}>
            <span className="absolute inset-y-3 left-0 w-1 rounded-r-full" style={{ backgroundColor: entry.project.color }} aria-hidden />
            <div className="min-w-0 flex-1">
                {entry.project.client && <div className="text-muted-foreground text-xs italic">{entry.project.client}</div>}
                <div className="font-semibold">{entry.project.name}</div>
                {entry.description && <p className="text-muted-foreground mt-1 text-sm whitespace-pre-line">{entry.description}</p>}
                {entry.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {entry.tags.map((t) => (
                            <TagBadge key={t.id} name={t.name} color={t.color} />
                        ))}
                    </div>
                )}
            </div>
            <div className="flex shrink-0 items-start gap-3">
                <div className="text-right">
                    <div className="text-lg font-semibold tabular-nums">{formatDuration(entry.duration_minutes)}</div>
                    <div className="text-muted-foreground text-xs tabular-nums">
                        {timeOf(entry.started_at)} – {timeOf(entry.ended_at)}
                        {nextDay && ' (+1)'}
                    </div>
                    <div className="text-primary mt-0.5 text-xs font-medium tabular-nums">{formatMoney(entry.amount)}</div>
                </div>
                <div className="flex flex-col gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="size-8" aria-label="Edit" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                        <Pencil />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-destructive size-8"
                        aria-label="Delete"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <Trash2 />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function roundDownToQuarter(time: string): string {
    const [h, m] = time.split(':').map(Number);
    return `${String(h).padStart(2, '0')}:${String(Math.floor(m / 15) * 15).padStart(2, '0')}`;
}

function addHour(time: string): string {
    const [h, m] = time.split(':').map(Number);
    return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
