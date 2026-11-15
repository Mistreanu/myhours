import { cn } from '@/lib/utils';

export function ColorDot({ color, className }: { color: string; className?: string }) {
    return <span className={cn('inline-block size-2.5 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} aria-hidden />;
}

export function TagBadge({ name, color, className }: { name: string; color: string; className?: string }) {
    return (
        <span
            className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', className)}
            style={{ backgroundColor: `${color}1f`, color }}
        >
            <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
            {name}
        </span>
    );
}
