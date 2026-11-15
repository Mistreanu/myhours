<?php

namespace App\Support;

use App\Models\Tag;
use App\Models\TimeEntry;

class EntryPresenter
{
    /**
     * Shape a time entry (with project.client and tags loaded) for the frontend.
     *
     * @return array<string, mixed>
     */
    public static function present(TimeEntry $entry): array
    {
        return [
            'id' => $entry->id,
            'description' => $entry->description,
            'started_at' => $entry->started_at->format('Y-m-d H:i'),
            'ended_at' => $entry->ended_at->format('Y-m-d H:i'),
            'duration_minutes' => $entry->duration_minutes,
            'hourly_rate' => (float) $entry->hourly_rate,
            'amount' => (float) $entry->amount,
            'project' => [
                'id' => $entry->project->id,
                'name' => $entry->project->name,
                'color' => $entry->project->color,
                'client' => $entry->project->client?->name,
            ],
            'tags' => $entry->tags->map(fn (Tag $t) => ['id' => $t->id, 'name' => $t->name, 'color' => $t->color])->values(),
        ];
    }
}
