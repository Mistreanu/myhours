import { ConfirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { EmptyState, PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatDuration, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Archive, ArchiveRestore, Coins, FileText, LoaderCircle, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Rate {
    id: number;
    name: string;
    hourly_rate: number;
    archived: boolean;
    entries_count: number;
    minutes: number;
    amount: number;
}

export default function Rates({ rates }: { rates: Rate[] }) {
    const [dialog, setDialog] = useState<{ rate: Rate | null } | null>(null);
    const [deleting, setDeleting] = useState<Rate | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    const archived = rates.filter((r) => r.archived);
    const visible = showArchived ? rates : rates.filter((r) => !r.archived);

    const toggleArchive = (r: Rate) =>
        router.put(route('rates.update', r.id), { name: r.name, hourly_rate: r.hourly_rate, archived: !r.archived }, { preserveScroll: true });

    return (
        <AppLayout breadcrumbs={[{ title: 'Rates', href: route('rates.index') }]}>
            <Head title="Rates" />

            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
                <PageHeader
                    title="Rates"
                    description="Your hourly rates by type of work, e.g. content editing, programming or image editing. Any rate can be used on any project."
                    actions={
                        <Button onClick={() => setDialog({ rate: null })}>
                            <Plus />
                            New rate
                        </Button>
                    }
                />

                {rates.length === 0 ? (
                    <EmptyState
                        icon={Coins}
                        title="No rates yet"
                        description="Add the hourly rates you charge, like “Programming – 100 RON/h”. You then pick one on every time entry."
                        action={
                            <Button onClick={() => setDialog({ rate: null })}>
                                <Plus />
                                New rate
                            </Button>
                        }
                    />
                ) : (
                    <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
                        <div className="text-muted-foreground hidden grid-cols-[minmax(0,1fr)_9rem_6rem_9rem_2.5rem] gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wide uppercase lg:grid">
                            <span>Rate</span>
                            <span className="text-right">Per hour</span>
                            <span className="text-right">Tracked</span>
                            <span className="text-right">Amount</span>
                            <span />
                        </div>
                        <div className="divide-y">
                            {visible.map((r) => (
                                <div
                                    key={r.id}
                                    className={cn(
                                        'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_9rem_6rem_9rem_2.5rem]',
                                        r.archived && 'opacity-60',
                                    )}
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                            <Coins className="size-4" />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 truncate font-semibold">
                                                {r.name}
                                                {r.archived && <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">Archived</span>}
                                            </div>
                                            <div className="text-muted-foreground text-sm">
                                                {r.entries_count} {r.entries_count === 1 ? 'entry' : 'entries'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right font-semibold whitespace-nowrap tabular-nums">
                                        {formatMoney(r.hourly_rate)}
                                        <span className="text-muted-foreground text-xs font-normal">/h</span>
                                    </div>
                                    <div className="text-muted-foreground hidden text-right tabular-nums lg:block">{formatDuration(r.minutes)}</div>
                                    <div className="hidden text-right whitespace-nowrap tabular-nums lg:block">{formatMoney(r.amount)}</div>
                                    <div className="flex justify-end">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="size-8" aria-label="Actions">
                                                    <MoreHorizontal />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setDialog({ rate: r })}>
                                                    <Pencil />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={route('reports.detailed', { rates: [r.id], all: 1 })}>
                                                        <FileText />
                                                        View entries
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => toggleArchive(r)}>
                                                    {r.archived ? <ArchiveRestore /> : <Archive />}
                                                    {r.archived ? 'Restore' : 'Archive'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    disabled={r.entries_count > 0}
                                                    onClick={() => setDeleting(r)}
                                                >
                                                    <Trash2 />
                                                    {r.entries_count > 0 ? 'Delete (in use)' : 'Delete'}
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
                                {showArchived ? 'Hide archived rates' : `Show ${archived.length} archived ${archived.length === 1 ? 'rate' : 'rates'}`}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {dialog && <RateDialog rate={dialog.rate} onClose={() => setDialog(null)} />}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => !o && setDeleting(null)}
                title="Delete rate?"
                description={deleting ? `“${deleting.name}” will be deleted permanently.` : ''}
                onConfirm={() => deleting && router.delete(route('rates.destroy', deleting.id), { preserveScroll: true, onFinish: () => setDeleting(null) })}
            />
        </AppLayout>
    );
}

function RateDialog({ rate, onClose }: { rate: Rate | null; onClose: () => void }) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: rate?.name ?? '',
        hourly_rate: rate ? String(rate.hourly_rate) : '',
        archived: rate?.archived ?? false,
        apply_to_entries: false as boolean,
    });

    const amountChanged = rate !== null && data.hourly_rate !== '' && Number(data.hourly_rate) !== rate.hourly_rate;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (rate) put(route('rates.update', rate.id), options);
        else post(route('rates.store'), options);
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="grid gap-5">
                    <DialogHeader>
                        <DialogTitle>{rate ? 'Edit rate' : 'New rate'}</DialogTitle>
                        <DialogDescription>A type of work and how much you charge for it per hour.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required autoFocus maxLength={100} placeholder="e.g. Programming" />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="hourly_rate">Hourly rate</Label>
                        <div className="relative">
                            <Input
                                id="hourly_rate"
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={data.hourly_rate}
                                onChange={(e) => setData('hourly_rate', e.target.value)}
                                required
                                placeholder="0.00"
                                className="[appearance:textfield] pr-24 tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">RON / hour</span>
                        </div>
                        <InputError message={errors.hourly_rate} />
                        {amountChanged && rate.entries_count > 0 && (
                            <label className="bg-muted/60 mt-1 flex items-start gap-3 rounded-lg p-3 text-sm">
                                <Checkbox checked={data.apply_to_entries} onCheckedChange={(c) => setData('apply_to_entries', c === true)} className="mt-0.5" />
                                <span>
                                    Also re-price the {rate.entries_count} existing {rate.entries_count === 1 ? 'entry' : 'entries'} with this rate
                                    <span className="text-muted-foreground block text-xs">Otherwise they keep the amount per hour they were saved with.</span>
                                </span>
                            </label>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {rate ? 'Save changes' : 'Create rate'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
