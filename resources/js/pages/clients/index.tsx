import { ConfirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { EmptyState, PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { formatDuration, formatMoney } from '@/lib/format';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Building2, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Client {
    id: number;
    name: string;
    notes: string | null;
    projects_count: number;
    minutes: number;
    amount: number;
}

export default function Clients({ clients }: { clients: Client[] }) {
    const [dialog, setDialog] = useState<{ client: Client | null } | null>(null);
    const [deleting, setDeleting] = useState<Client | null>(null);

    return (
        <AppLayout breadcrumbs={[{ title: 'Clients', href: route('clients.index') }]}>
            <Head title="Clients" />

            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
                <PageHeader
                    title="Clients"
                    description="Clients group your projects."
                    actions={
                        <Button onClick={() => setDialog({ client: null })}>
                            <Plus />
                            New client
                        </Button>
                    }
                />

                {clients.length === 0 ? (
                    <EmptyState
                        icon={Building2}
                        title="No clients yet"
                        description="Add the clients you work for, then attach projects to them."
                        action={
                            <Button onClick={() => setDialog({ client: null })}>
                                <Plus />
                                New client
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {clients.map((c) => (
                            <div key={c.id} className="group bg-card flex flex-col rounded-xl border p-5 shadow-xs transition-shadow hover:shadow-md">
                                <div className="flex items-start gap-3">
                                    <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
                                        {initials(c.name)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold">{c.name}</div>
                                        <Link
                                            href={route('projects.index')}
                                            className="text-muted-foreground hover:text-foreground text-sm"
                                        >
                                            {c.projects_count} {c.projects_count === 1 ? 'project' : 'projects'}
                                        </Link>
                                    </div>
                                    <div className="flex gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                                        <Button variant="ghost" size="icon" className="size-8" aria-label="Edit" onClick={() => setDialog({ client: c })}>
                                            <Pencil />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="hover:text-destructive size-8" aria-label="Delete" onClick={() => setDeleting(c)}>
                                            <Trash2 />
                                        </Button>
                                    </div>
                                </div>
                                {c.notes && <p className="text-muted-foreground mt-3 line-clamp-2 text-sm">{c.notes}</p>}
                                <div className="mt-auto grid grid-cols-2 gap-3 border-t pt-4 mt-4 text-sm">
                                    <div>
                                        <div className="text-muted-foreground text-xs">Tracked</div>
                                        <div className="font-semibold tabular-nums">{formatDuration(c.minutes)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-xs">Amount</div>
                                        <div className="text-primary font-semibold tabular-nums">{formatMoney(c.amount)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {dialog && <ClientDialog client={dialog.client} onClose={() => setDialog(null)} />}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => !o && setDeleting(null)}
                title="Delete client?"
                description={
                    deleting
                        ? deleting.projects_count > 0
                            ? `“${deleting.name}” still has projects, so it cannot be deleted until they are moved or deleted.`
                            : `“${deleting.name}” will be deleted permanently.`
                        : ''
                }
                onConfirm={() => deleting && router.delete(route('clients.destroy', deleting.id), { preserveScroll: true, onFinish: () => setDeleting(null) })}
            />
        </AppLayout>
    );
}

function ClientDialog({ client, onClose }: { client: Client | null; onClose: () => void }) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: client?.name ?? '',
        notes: client?.notes ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (client) put(route('clients.update', client.id), options);
        else post(route('clients.store'), options);
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="grid gap-5">
                    <DialogHeader>
                        <DialogTitle>{client ? 'Edit client' : 'New client'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required autoFocus placeholder="e.g. Acme SRL" />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" value={data.notes} onChange={(e) => setData('notes', e.target.value)} placeholder="Optional" rows={3} />
                        <InputError message={errors.notes} />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {client ? 'Save changes' : 'Create client'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]!.toUpperCase())
        .join('');
}
