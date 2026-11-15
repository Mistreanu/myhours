export interface TagOption {
    id: number;
    name: string;
    color: string;
}

export interface RateOption {
    id: number;
    name: string;
    hourly_rate: number;
    archived?: boolean;
}

export interface ProjectOption {
    id: number;
    name: string;
    color: string;
    default_rate_id?: number | null;
    archived?: boolean;
    client: string | null;
}

export interface ClientOption {
    id: number;
    name: string;
}

export interface TimeEntry {
    id: number;
    description: string | null;
    started_at: string; // "YYYY-MM-DD HH:mm"
    ended_at: string;
    duration_minutes: number;
    hourly_rate: number; // amount per hour saved with the entry
    amount: number;
    project: { id: number; name: string; color: string; client: string | null };
    rate: { id: number; name: string } | null;
    tags: TagOption[];
}
