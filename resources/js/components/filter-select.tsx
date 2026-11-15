import { ColorDot } from '@/components/color-dot';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';

export interface FilterOption {
    id: number;
    label: string;
    sublabel?: string | null;
    color?: string;
}

interface Props {
    label: string;
    icon: LucideIcon;
    options: FilterOption[];
    selected: number[];
    onChange: (ids: number[]) => void;
}

/** Pill-shaped multi-select used in the report filter bar. */
export function FilterSelect({ label, icon: Icon, options, selected, onChange }: Props) {
    const active = selected.length > 0;
    const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors',
                        active ? 'border-primary/40 bg-primary/10 text-primary' : 'bg-background hover:bg-accent',
                    )}
                >
                    <Icon className="size-4" />
                    {label}
                    {active && <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs leading-5 tabular-nums">{selected.length}</span>}
                    <ChevronDown className="size-3.5 opacity-60" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
                <Command>
                    <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
                    <CommandList>
                        <CommandEmpty>Nothing found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((o) => (
                                <CommandItem key={o.id} value={`${o.label} ${o.sublabel ?? ''} #${o.id}`} onSelect={() => toggle(o.id)}>
                                    <span
                                        className={cn(
                                            'flex size-4 items-center justify-center rounded-sm border',
                                            selected.includes(o.id) ? 'bg-primary border-primary text-primary-foreground' : 'border-input',
                                        )}
                                    >
                                        {selected.includes(o.id) && <Check className="size-3 stroke-[3]" />}
                                    </span>
                                    {o.color && <ColorDot color={o.color} />}
                                    <span className="truncate">{o.label}</span>
                                    {o.sublabel && <span className="text-muted-foreground ml-auto truncate text-xs">{o.sublabel}</span>}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                    {active && (
                        <div className="border-t p-1">
                            <button
                                type="button"
                                onClick={() => onChange([])}
                                className="text-muted-foreground hover:bg-accent w-full rounded-md px-2 py-1.5 text-left text-sm"
                            >
                                Clear selection
                            </button>
                        </div>
                    )}
                </Command>
            </PopoverContent>
        </Popover>
    );
}
