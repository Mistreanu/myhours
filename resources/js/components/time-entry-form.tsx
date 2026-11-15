import InputError from '@/components/input-error';
import { ProjectSelect } from '@/components/project-select';
import { TagSelect, type TagValue } from '@/components/tag-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addDays, addMinutesToTime, formatDuration, formatMoney, minutesBetween, parseDurationInput, timeOf } from '@/lib/format';
import { type ProjectOption, type TagOption, type TimeEntry } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { Calendar, Clock, LoaderCircle, X } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

interface Props {
    projects: ProjectOption[];
    tags: TagOption[];
    /** When set, the form edits this entry; otherwise it creates a new one. */
    entry?: TimeEntry;
    defaults?: { date: string; start: string; end: string; projectId?: number | null };
    onDone: (saved: { date: string; end: string; projectId: number | null }) => void;
    onCancel: () => void;
    bare?: boolean;
}

type FormData = {
    project_id: number | null;
    description: string;
    date: string;
    start: string;
    end: string;
    tags: TagValue[];
};

export function TimeEntryForm({ projects, tags, entry, defaults, onDone, onCancel, bare = false }: Props) {
    const form = useForm<FormData>({
        project_id: entry?.project.id ?? defaults?.projectId ?? null,
        description: entry?.description ?? '',
        date: entry ? entry.started_at.slice(0, 10) : (defaults?.date ?? ''),
        start: entry ? timeOf(entry.started_at) : (defaults?.start ?? '09:00'),
        end: entry ? timeOf(entry.ended_at) : (defaults?.end ?? '10:00'),
        tags: entry?.tags.map((t) => t.id) ?? [],
    });
    const { data, setData, errors, processing } = form;

    const minutes = minutesBetween(data.start, data.end);
    const crossesMidnight = minutes !== null && data.end <= data.start;
    const project = projects.find((p) => p.id === data.project_id);
    // Editing keeps the rate saved on the entry unless the project changes.
    const rate = entry && entry.project.id === data.project_id ? entry.hourly_rate : (project?.hourly_rate ?? 0);
    const amount = minutes !== null ? Math.round(minutes * rate * 100 / 60) / 100 : 0;

    const [durationText, setDurationText] = useState(minutes !== null ? formatDuration(minutes) : '');
    useEffect(() => {
        setDurationText(minutes !== null ? formatDuration(minutes) : '');
    }, [minutes]);

    const applyDuration = () => {
        const parsed = parseDurationInput(durationText);
        if (parsed && parsed > 0 && parsed <= 24 * 60 && /^\d{2}:\d{2}$/.test(data.start)) {
            setData('end', addMinutesToTime(data.start, parsed));
        } else {
            setDurationText(minutes !== null ? formatDuration(minutes) : '');
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const endDate = crossesMidnight ? addDays(data.date, 1) : data.date;

        form.transform((d) => ({
            project_id: d.project_id,
            description: d.description,
            tags: d.tags,
            started_at: `${d.date} ${d.start}`,
            ended_at: `${endDate} ${d.end}`,
        }));

        const options = {
            preserveScroll: true,
            onSuccess: () => onDone({ date: data.date, end: data.end, projectId: data.project_id }),
        };

        if (entry) {
            form.put(route('time-entries.update', entry.id), options);
        } else {
            form.post(route('time-entries.store'), options);
        }
    };

    const formErrors = errors as Partial<Record<string, string>>;
    const timeError = formErrors.started_at ?? formErrors.ended_at;
    const tagError = Object.entries(formErrors).find(([key]) => key.startsWith('tags'))?.[1];

    return (
        <form onSubmit={submit} className={bare ? '' : 'bg-card rounded-xl border p-5 shadow-sm'}>
            {!bare && (
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold">{entry ? 'Edit time entry' : 'Add time entry'}</h3>
                    <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onCancel} aria-label="Close">
                        <X />
                    </Button>
                </div>
            )}

            <div className="grid gap-5 md:grid-cols-[1fr_260px]">
                <div className="grid content-start gap-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor="project">Project</Label>
                        <ProjectSelect id="project" projects={projects} value={data.project_id} onChange={(id) => setData('project_id', id)} invalid={!!errors.project_id} />
                        <InputError message={errors.project_id} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="What did you work on?"
                            rows={3}
                        />
                        <InputError message={errors.description} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="tags">Tags</Label>
                        <TagSelect id="tags" tags={tags} value={data.tags} onChange={(v) => setData('tags', v)} />
                        <InputError message={tagError} />
                    </div>
                </div>

                <div className="grid content-start gap-3 md:border-l md:pl-5">
                    <div className="grid gap-1.5">
                        <Label htmlFor="date">Date</Label>
                        <div className="relative">
                            <Calendar className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input id="date" type="date" required value={data.date} onChange={(e) => setData('date', e.target.value)} className="pl-9" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="start">Start</Label>
                            <Input id="start" type="time" required value={data.start} onChange={(e) => setData('start', e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="end">End</Label>
                            <Input id="end" type="time" required value={data.end} onChange={(e) => setData('end', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="duration">Duration</Label>
                        <div className="relative">
                            <Clock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                id="duration"
                                value={durationText}
                                onChange={(e) => setDurationText(e.target.value)}
                                onBlur={applyDuration}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        applyDuration();
                                    }
                                }}
                                placeholder="h:mm"
                                className="pl-9 tabular-nums"
                            />
                        </div>
                        {crossesMidnight && <p className="text-muted-foreground text-xs">Ends the next day.</p>}
                        <InputError message={timeError} />
                    </div>
                    <div className="bg-muted/60 rounded-lg px-3 py-2.5 text-sm">
                        <div className="text-muted-foreground flex justify-between">
                            <span>Rate</span>
                            <span className="tabular-nums">{project || entry ? `${formatMoney(rate)}/h` : '—'}</span>
                        </div>
                        <div className="mt-1 flex justify-between font-semibold">
                            <span>Amount</span>
                            <span className="text-primary tabular-nums">{formatMoney(amount)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
                <Button type="submit" disabled={processing}>
                    {processing && <LoaderCircle className="size-4 animate-spin" />}
                    {entry ? 'Save changes' : 'Add time entry'}
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}
