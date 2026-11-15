import { TagBadge } from '@/components/color-dot';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { type TagOption } from '@/types/models';
import { Check, Plus, Tag as TagIcon, X } from 'lucide-react';
import { useState } from 'react';

/** A selected value is either an existing tag id or the name of a tag to create on save. */
export type TagValue = number | string;

interface Props {
    tags: TagOption[];
    value: TagValue[];
    onChange: (value: TagValue[]) => void;
    id?: string;
}

const NEW_TAG_COLOR = '#64748b';

export function TagSelect({ tags, value, onChange, id }: Props) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const term = search.trim();
    const exactMatch = tags.some((t) => t.name.toLowerCase() === term.toLowerCase());
    const alreadyPending = value.some((v) => typeof v === 'string' && v.toLowerCase() === term.toLowerCase());

    const toggle = (v: TagValue) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

    const selectedBadges = value.map((v) => {
        if (typeof v === 'string') return { key: `new-${v}`, value: v, name: v, color: NEW_TAG_COLOR };
        const tag = tags.find((t) => t.id === v);
        return tag ? { key: `id-${v}`, value: v, name: tag.name, color: tag.color } : null;
    });

    return (
        <Popover
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (!o) setSearch('');
            }}
        >
            <PopoverTrigger asChild>
                <button
                    id={id}
                    type="button"
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border px-3 py-1.5 text-left text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
                >
                    {value.length === 0 && (
                        <span className="text-muted-foreground flex items-center gap-2">
                            <TagIcon className="size-4" />
                            Add tags…
                        </span>
                    )}
                    {selectedBadges.map(
                        (b) =>
                            b && (
                                <span key={b.key} className="group inline-flex items-center">
                                    <TagBadge name={b.name} color={b.color} />
                                    <span
                                        role="button"
                                        tabIndex={-1}
                                        aria-label={`Remove ${b.name}`}
                                        className="text-muted-foreground hover:text-foreground -ml-0.5 rounded-full p-0.5"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggle(b.value);
                                        }}
                                    >
                                        <X className="size-3" />
                                    </span>
                                </span>
                            ),
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-64">
                <Command>
                    <CommandInput placeholder="Search or create a tag…" value={search} onValueChange={setSearch} maxLength={50} />
                    <CommandList>
                        <CommandEmpty>{term ? 'No matching tag.' : 'No tags yet. Type a name to create one.'}</CommandEmpty>
                        {term && !exactMatch && !alreadyPending && (
                            <CommandGroup>
                                <CommandItem
                                    value={`__create__ ${term}`}
                                    onSelect={() => {
                                        onChange([...value, term]);
                                        setSearch('');
                                    }}
                                >
                                    <Plus className="size-4" />
                                    Create tag “{term}”
                                </CommandItem>
                            </CommandGroup>
                        )}
                        {tags.length > 0 && (
                            <CommandGroup heading="Tags">
                                {tags.map((t) => (
                                    <CommandItem key={t.id} value={`${t.name} #${t.id}`} onSelect={() => toggle(t.id)}>
                                        <TagBadge name={t.name} color={t.color} />
                                        <Check className={cn('ml-auto size-4', value.includes(t.id) ? 'opacity-100' : 'opacity-0')} />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
