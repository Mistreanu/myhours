<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TimeEntry extends Model
{
    /** @use HasFactory<\Database\Factories\TimeEntryFactory> */
    use HasFactory;

    protected $fillable = ['user_id', 'project_id', 'description', 'started_at', 'ended_at', 'hourly_rate'];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'duration_minutes' => 'integer',
            'hourly_rate' => 'decimal:2',
            'amount' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        // Duration and amount are always derived from the times and the rate,
        // so they can never drift out of sync with what was entered.
        static::saving(function (TimeEntry $entry) {
            $entry->duration_minutes = (int) $entry->started_at->diffInMinutes($entry->ended_at);
            $entry->amount = self::calculateAmount($entry->duration_minutes, (string) $entry->hourly_rate);
        });
    }

    public static function calculateAmount(int $minutes, string $rate): string
    {
        return number_format(round($minutes * (float) $rate / 60, 2), 2, '.', '');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    /**
     * Report filters shared by the detailed view and the Excel export.
     *
     * @param  array{from?: ?string, to?: ?string, clients?: array<int>, projects?: array<int>, tags?: array<int>, search?: ?string}  $filters
     */
    public function scopeFiltered(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->where('started_at', '>=', $from.' 00:00:00'))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->where('started_at', '<=', $to.' 23:59:59'))
            ->when($filters['projects'] ?? [], fn (Builder $q, array $ids) => $q->whereIn('project_id', $ids))
            ->when($filters['clients'] ?? [], fn (Builder $q, array $ids) => $q->whereHas('project', fn (Builder $p) => $p->whereIn('client_id', $ids)))
            ->when($filters['tags'] ?? [], fn (Builder $q, array $ids) => $q->whereHas('tags', fn (Builder $t) => $t->whereIn('tags.id', $ids)))
            ->when($filters['search'] ?? null, fn (Builder $q, string $s) => $q->where('description', 'like', '%'.addcslashes($s, '%_\\').'%'));
    }
}
