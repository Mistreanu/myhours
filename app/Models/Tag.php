<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Tag extends Model
{
    /** @use HasFactory<\Database\Factories\TagFactory> */
    use HasFactory;

    public const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#64748b'];

    protected $fillable = ['name', 'color'];

    public static function randomColor(): string
    {
        return self::COLORS[array_rand(self::COLORS)];
    }

    public function timeEntries(): BelongsToMany
    {
        return $this->belongsToMany(TimeEntry::class);
    }
}
