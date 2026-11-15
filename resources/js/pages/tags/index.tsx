import { TagBadge } from '@/components/color-dot';
import { ColorSwatches } from '@/components/color-swatches';
import { ConfirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { EmptyState, PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { LoaderCircle, Pencil, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Tag {
    id: number;
    name: string;
    color: string;
    entries_count: number;
}

export default function Tags({ tags, palette }: { tags: Tag[]; palette: string[] }) {
    const [dialog, setDialog] = useState<{ tag: Tag | null } | null>(null);
    const [deleting, setDeleting] = useState<Tag | null>(null);

    return (
        <AppLayout breadcrumbs={[{ title: 'Tags', href: route('tags.index') }]}>
            <Head title="Tags" />

            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
                <PageHeader
                    title="Tags"
                    description="Global tags you can attach to any time entry. You can also create them right from the time entry form."
                    actions={
                        <Button onClick={() => setDialog({ tag: null })}>
                            <Plus />
                            New tag
                        </Button>
                    }
                />

                {tags.length === 0 ? (
                    <EmptyState
                        icon={TagIcon}
                        title="No tags yet"
                        description="Tags help you categorise work (e.g. development, meeting, support) and filter reports."
                        action={
                            <Button onClick={() => setDialog({ tag: null })}>
                                <Plus />
                                New tag
                            </Button>
                        }
                    />
                ) : (
                    <div className="bg-card divide-y overflow-hidden rounded-xl border shadow-xs">
                        {tags.map((t) => (
                            <div key={t.id} className="group flex items-center gap-4 px-5 py-3">
                                <TagBadge name={t.name} color={t.color} className="text-sm" />
                                <Link
                                    href={route('reports.detailed', { tags: [t.id], all: 1 })}
                                    className="text-muted-foreground hover:text-foreground text-sm"
                                >
                                    {t.entries_count} {t.entries_count === 1 ? 'entry' : 'entries'}
                                </Link>
                                <div className="ml-auto flex gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                                    <Button variant="ghost" size="icon" className="size-8" aria-label="Edit" onClick={() => setDialog({ tag: t })}>
                                        <Pencil />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="hover:text-destructive size-8" aria-label="Delete" onClick={() => setDeleting(t)}>
                                        <Trash2 />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {dialog && <TagDialog tag={dialog.tag} palette={palette} onClose={() => setDialog(null)} />}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => !o && setDeleting(null)}
                title="Delete tag?"
                description={
                    deleting
                        ? `“${deleting.name}” will be removed${deleting.entries_count ? ` from ${deleting.entries_count} ${deleting.entries_count === 1 ? 'entry' : 'entries'}` : ''}. The entries themselves are kept.`
                        : ''
                }
                onConfirm={() => deleting && router.delete(route('tags.destroy', deleting.id), { preserveScroll: true, onFinish: () => setDeleting(null) })}
            />
        </AppLayout>
    );
}

function TagDialog({ tag, palette, onClose }: { tag: Tag | null; palette: string[]; onClose: () => void }) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: tag?.name ?? '',
        color: tag?.color ?? palette[0],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (tag) put(route('tags.update', tag.id), options);
        else post(route('tags.store'), options);
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="grid gap-5">
                    <DialogHeader>
                        <DialogTitle>{tag ? 'Edit tag' : 'New tag'}</DialogTitle>
                        <DialogDescription>
                            Preview: <TagBadge name={data.name || 'tag'} color={data.color} />
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required autoFocus maxLength={50} placeholder="e.g. development" />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label>Color</Label>
                        <ColorSwatches value={data.color} onChange={(c) => setData('color', c)} colors={palette} />
                        <InputError message={errors.color} />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {tag ? 'Save changes' : 'Create tag'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
