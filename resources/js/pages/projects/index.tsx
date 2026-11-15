import { ColorDot } from '@/components/color-dot';
import { ColorSwatches, PALETTE } from '@/components/color-swatches';
import { ConfirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { EmptyState, PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { formatDuration, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type ClientOption, type RateOption } from '@/types/models';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Archive, ArchiveRestore, Briefcase, LoaderCircle, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Project {
    id: number;
    name: string;
    color: string;
    archived: boolean;
    client_id: number | null;
    client: string | null;
    default_rate_id: number | null;
    default_rate: { name: string; hourly_rate: number } | null;
    entries_count: number;
    minutes: number;
    amount: number;
}

interface Props {
    projects: Project[];
    clients: ClientOption[];
    rates: RateOption[];
}

export default function Projects({ projects, clients, rates }: Props) {
    const [dialog, setDialog] = useState<{ project: Project | null } | null>(null);
    const [deleting, setDeleting] = useState<Project | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    const active = projects.filter((p) => !p.archived);
    const archived = projects.filter((p) => p.archived);
    const visible = showArchived ? projects : active;

    const toggleArchive = (p: Project) =>
        router.put(
            route('projects.update', p.id),
            { name: p.name, client_id: p.client_id, default_rate_id: p.default_rate_id, color: p.color, archived: !p.archived },
            { preserveScroll: true },
        );

    return (
        <AppLayout breadcrumbs={[{ title: 'Projects', href: route('projects.index') }]}>
            <Head title="Projects" />

            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
                <PageHeader
                    title="Projects"
                    description="Group your work by project. A project can have a default rate that is pre-selected when you track time on it."
                    actions={
                        <Button onClick={() => setDialog({ project: null })}>
                            <Plus />
                            New project
                        </Button>
                    }
                />

                {projects.length === 0 ? (
                    <EmptyState
                        icon={Briefcase}
                        title="No projects yet"
                        description="Create your first project. You can attach it to a client and give it a default rate."
                        action={
                            <Button onClick={() => setDialog({ project: null })}>
                                <Plus />
                                New project
                            </Button>
                        }
                    />
                ) : (
                    <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
                        <div className="text-muted-foreground hidden grid-cols-[minmax(0,1fr)_11rem_6rem_9rem_2.5rem] gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wide uppercase lg:grid">
                            <span>Project</span>
                            <span className="text-right">Default rate</span>
                            <span className="text-right">Tracked</span>
                            <span className="text-right">Amount</span>
                            <span />
                        </div>
                        <div className="divide-y">
                            {visible.map((p) => (
                                <div
                                    key={p.id}
                                    className={cn(
                                        'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_11rem_6rem_9rem_2.5rem]',
                                        p.archived && 'opacity-60',
                                    )}
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${p.color}22` }}>
                                            <ColorDot color={p.color} className="size-3" />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 truncate font-semibold">
                                                {p.name}
                                                {p.archived && <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">Archived</span>}
                                            </div>
                                            <div className="text-muted-foreground truncate text-sm">{p.client ?? 'No client'}</div>
                                        </div>
                                    </div>
                                    <div className="min-w-0 text-right text-sm">
                                        {p.default_rate ? (
                                            <>
                                                <div className="truncate font-medium">{p.default_rate.name}</div>
                                                <div className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">{formatMoney(p.default_rate.hourly_rate)}/h</div>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </div>
                                    <div className="text-muted-foreground hidden text-right tabular-nums lg:block">{formatDuration(p.minutes)}</div>
                                    <div className="hidden text-right whitespace-nowrap tabular-nums lg:block">{formatMoney(p.amount)}</div>
                                    <div className="flex justify-end">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="size-8" aria-label="Actions">
                                                    <MoreHorizontal />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setDialog({ project: p })}>
                                                    <Pencil />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={route('reports.detailed', { projects: [p.id], all: 1 })}>
                                                        <Briefcase />
                                                        View entries
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => toggleArchive(p)}>
                                                    {p.archived ? <ArchiveRestore /> : <Archive />}
                                                    {p.archived ? 'Restore' : 'Archive'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    disabled={p.entries_count > 0}
                                                    onClick={() => setDeleting(p)}
                                                >
                                                    <Trash2 />
                                                    {p.entries_count > 0 ? 'Delete (has entries)' : 'Delete'}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {archived.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowArchived((s) => !s)}
                                className="text-muted-foreground hover:bg-muted/50 w-full border-t px-5 py-3 text-left text-sm"
                            >
                                {showArchived ? 'Hide archived projects' : `Show ${archived.length} archived ${archived.length === 1 ? 'project' : 'projects'}`}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {dialog && <ProjectDialog project={dialog.project} clients={clients} rates={rates} onClose={() => setDialog(null)} />}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => !o && setDeleting(null)}
                title="Delete project?"
                description={deleting ? `“${deleting.name}” will be deleted permanently.` : ''}
                onConfirm={() => deleting && router.delete(route('projects.destroy', deleting.id), { preserveScroll: true, onFinish: () => setDeleting(null) })}
            />
        </AppLayout>
    );
}

function ProjectDialog({ project, clients, rates, onClose }: { project: Project | null; clients: ClientOption[]; rates: RateOption[]; onClose: () => void }) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: project?.name ?? '',
        client_id: project?.client_id ?? (null as number | null),
        default_rate_id: project?.default_rate_id ?? (null as number | null),
        color: project?.color ?? PALETTE[Math.floor(Math.random() * PALETTE.length)],
        archived: project?.archived ?? false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (project) put(route('projects.update', project.id), options);
        else post(route('projects.store'), options);
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="grid gap-5">
                    <DialogHeader>
                        <DialogTitle>{project ? 'Edit project' : 'New project'}</DialogTitle>
                        <DialogDescription>You can still pick any rate on each time entry.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required autoFocus placeholder="e.g. Website redesign" />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Client</Label>
                        <Select value={data.client_id ? String(data.client_id) : 'none'} onValueChange={(v) => setData('client_id', v === 'none' ? null : Number(v))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No client</SelectItem>
                                {clients.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {clients.length === 0 && (
                            <p className="text-muted-foreground text-xs">
                                No clients yet. <Link href={route('clients.index')} className="text-primary hover:underline">Add a client</Link>
                            </p>
                        )}
                        <InputError message={errors.client_id} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Default rate</Label>
                        <Select
                            value={data.default_rate_id ? String(data.default_rate_id) : 'none'}
                            onValueChange={(v) => setData('default_rate_id', v === 'none' ? null : Number(v))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No default rate</SelectItem>
                                {rates
                                    .filter((r) => !r.archived || r.id === data.default_rate_id)
                                    .map((r) => (
                                        <SelectItem key={r.id} value={String(r.id)}>
                                            {r.name} · {formatMoney(r.hourly_rate)}/h
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        {rates.length === 0 && (
                            <p className="text-muted-foreground text-xs">
                                No rates yet. <Link href={route('rates.index')} className="text-primary hover:underline">Add your hourly rates</Link>
                            </p>
                        )}
                        <InputError message={errors.default_rate_id} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Color</Label>
                        <ColorSwatches value={data.color} onChange={(c) => setData('color', c)} />
                        <InputError message={errors.color} />
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {project ? 'Save changes' : 'Create project'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
