export interface TagOption {
    id: number;
    name: string;
    color: string;
}

export interface ProjectOption {
    id: number;
    name: string;
    color: string;
    hourly_rate?: number;
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
    hourly_rate: number;
    amount: number;
    project: { id: number; name: string; color: string; client: string | null };
    tags: TagOption[];
}
