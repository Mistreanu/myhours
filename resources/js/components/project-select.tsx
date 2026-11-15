import { ColorDot } from '@/components/color-dot';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { type ProjectOption } from '@/types/models';
import { Link } from '@inertiajs/react';
import { Briefcase, Check, ChevronsUpDown, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Props {
    projects: ProjectOption[];
    value: number | null;
    onChange: (id: number) => void;
    invalid?: boolean;
    id?: string;
}

export function ProjectSelect({ projects, value, onChange, invalid, id }: Props) {
    const [open, setOpen] = useState(false);
    const selected = projects.find((p) => p.id === value) ?? null;

    // Group by client; archived projects stay hidden unless already selected.
    const groups = useMemo(() => {
        const map = new Map<string, ProjectOption[]>();
        for (const p of projects) {
            if (p.archived && p.id !== value) continue;
            const key = p.client ?? 'No client';
            map.set(key, [...(map.get(key) ?? []), p]);
        }
        return [...map.entries()].sort(([a], [b]) => (a === 'No client' ? 1 : b === 'No client' ? -1 : a.localeCompare(b)));
    }, [projects, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    id={id}
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    aria-invalid={invalid || undefined}
                    className={cn(
                        'border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full items-center gap-2 rounded-md border px-3 text-left text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden',
                        invalid && 'border-red-500',
                    )}
                >
                    {selected ? (
                        <>
                            <ColorDot color={selected.color} />
                            <span className="truncate">
                                {selected.client && <span className="text-muted-foreground">{selected.client} · </span>}
                                <span className="font-medium">{selected.name}</span>
                            </span>
                        </>
                    ) : (
                        <>
                            <Briefcase className="text-muted-foreground size-4" />
                            <span className="text-muted-foreground">Select a project…</span>
                        </>
                    )}
                    <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72">
                <Command>
                    <CommandInput placeholder="Search projects…" />
                    <CommandList>
                        <CommandEmpty>No project found.</CommandEmpty>
                        {groups.map(([client, items]) => (
                            <CommandGroup key={client} heading={client}>
                                {items.map((p) => (
                                    <CommandItem
                                        key={p.id}
                                        value={`${p.client ?? ''} ${p.name} #${p.id}`}
                                        onSelect={() => {
                                            onChange(p.id);
                                            setOpen(false);
                                        }}
                                    >
                                        <ColorDot color={p.color} />
                                        <span className="truncate">{p.name}</span>
                                        <Check className={cn('ml-auto size-4', p.id === value ? 'opacity-100' : 'opacity-0')} />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                    <div className="border-t p-1">
                        <Link
                            href={route('projects.index')}
                            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                        >
                            <Settings2 className="size-4" />
                            Manage projects
                        </Link>
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
