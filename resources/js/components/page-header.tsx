import { type ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
            </div>
            {actions}
        </div>
    );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: ReactNode }) {
    return (
        <div className="bg-card flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
            <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-full">
                <Icon className="size-6" />
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
