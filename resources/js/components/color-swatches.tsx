import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export const PALETTE = ['#10b981', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#14b8a6', '#64748b'];

export function ColorSwatches({ value, onChange, colors = PALETTE }: { value: string; onChange: (color: string) => void; colors?: string[] }) {
    const isCustom = !colors.includes(value.toLowerCase());

    return (
        <div className="flex flex-wrap items-center gap-2">
            {colors.map((c) => (
                <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => onChange(c)}
                    className={cn('flex size-7 items-center justify-center rounded-full ring-offset-2 transition', value.toLowerCase() === c && 'ring-2 ring-current')}
                    style={{ backgroundColor: c, color: c }}
                >
                    {value.toLowerCase() === c && <Check className="size-4 text-white" />}
                </button>
            ))}
            <label
                className={cn(
                    'relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed text-xs',
                    isCustom && 'ring-2 ring-offset-2',
                )}
                style={isCustom ? { backgroundColor: value } : undefined}
                title="Custom color"
            >
                {!isCustom && '+'}
                <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
        </div>
    );
}
