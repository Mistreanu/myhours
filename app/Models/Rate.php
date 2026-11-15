<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A named hourly rate, e.g. "Programming" at 100 RON/h. Any time entry can use any rate.
 */
class Rate extends Model
{
    /** @use HasFactory<\Database\Factories\RateFactory> */
    use HasFactory;

    protected $fillable = ['name', 'hourly_rate', 'archived'];

    protected function casts(): array
    {
        return [
            'hourly_rate' => 'decimal:2',
            'archived' => 'boolean',
        ];
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    /**
     * Options for the rate pickers: active rates, plus archived ones that are still
     * referenced (so existing entries and projects keep showing their rate).
     *
     * @param  array<int|null>  $keepIds
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    public static function options(array $keepIds = [])
    {
        return self::query()
            ->where(fn ($q) => $q->where('archived', false)->orWhereIn('id', array_filter($keepIds)))
            ->orderBy('archived')
            ->orderBy('name')
            ->get()
            ->map(fn (Rate $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'hourly_rate' => (float) $r->hourly_rate,
                'archived' => $r->archived,
            ]);
    }
}
