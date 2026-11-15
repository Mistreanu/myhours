import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type RateOption } from '@/types/models';
import { Link } from '@inertiajs/react';
import { Check, ChevronsUpDown, Coins, Settings2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    rates: RateOption[];
    value: number | null;
    onChange: (id: number | null) => void;
    id?: string;
}

export function RateSelect({ rates, value, onChange, id }: Props) {
    const [open, setOpen] = useState(false);
    const selected = rates.find((r) => r.id === value) ?? null;
    // Archived rates stay hidden unless already selected.
    const visible = rates.filter((r) => !r.archived || r.id === value);

    const pick = (rateId: number | null) => {
        onChange(rateId);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    id={id}
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full items-center gap-2 rounded-md border px-3 text-left text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
                >
                    <Coins className="text-muted-foreground size-4" />
                    {selected ? (
                        <span className="truncate">
                            <span className="font-medium">{selected.name}</span>
                            <span className="text-muted-foreground"> · {formatMoney(selected.hourly_rate)}/h</span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">No rate (0 RON)</span>
                    )}
                    <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72">
                <Command>
                    <CommandInput placeholder="Search rates…" />
                    <CommandList>
                        <CommandEmpty>No rate found.</CommandEmpty>
                        <CommandGroup>
                            {visible.map((r) => (
                                <CommandItem key={r.id} value={`${r.name} #${r.id}`} onSelect={() => pick(r.id)}>
                                    <span className="truncate">{r.name}</span>
                                    <span className="text-muted-foreground ml-auto text-xs tabular-nums">{formatMoney(r.hourly_rate)}/h</span>
                                    <Check className={cn('size-4', r.id === value ? 'opacity-100' : 'opacity-0')} />
                                </CommandItem>
                            ))}
                            <CommandItem value="__none__ no rate" onSelect={() => pick(null)}>
                                <span className="text-muted-foreground">No rate (0 RON)</span>
                                <Check className={cn('ml-auto size-4', value === null ? 'opacity-100' : 'opacity-0')} />
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                    <div className="border-t p-1">
                        <Link
                            href={route('rates.index')}
                            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                        >
                            <Settings2 className="size-4" />
                            Manage rates
                        </Link>
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
