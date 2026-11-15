<?php

namespace App\Http\Controllers;

use App\Http\Requests\TimeEntryRequest;
use App\Models\Rate;
use App\Models\Tag;
use App\Models\TimeEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TimeEntryController extends Controller
{
    public function store(TimeEntryRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request) {
            $entry = $request->user()->timeEntries()->create([
                ...$request->safe()->only(['project_id', 'rate_id', 'description', 'started_at', 'ended_at']),
                'hourly_rate' => $this->rateAmount($request->input('rate_id')),
            ]);

            $entry->tags()->sync($this->resolveTagIds($request->input('tags', [])));
        });

        return back()->with('success', 'Time entry added.');
    }

    public function update(TimeEntryRequest $request, TimeEntry $timeEntry): RedirectResponse
    {
        $this->authorizeOwner($request, $timeEntry);

        DB::transaction(function () use ($request, $timeEntry) {
            $timeEntry->fill($request->safe()->only(['project_id', 'rate_id', 'description', 'started_at', 'ended_at']));

            // Picking another rate re-prices the entry; otherwise the amount per hour
            // saved with the entry is kept, even if the rate itself changed since.
            if ($timeEntry->isDirty('rate_id')) {
                $timeEntry->hourly_rate = $this->rateAmount($timeEntry->rate_id);
            }

            $timeEntry->save();
            $timeEntry->tags()->sync($this->resolveTagIds($request->input('tags', [])));
        });

        return back()->with('success', 'Time entry updated.');
    }

    public function destroy(Request $request, TimeEntry $timeEntry): RedirectResponse
    {
        $this->authorizeOwner($request, $timeEntry);

        $timeEntry->delete();

        return back()->with('success', 'Time entry deleted.');
    }

    /** Hourly amount of the chosen rate; an entry without a rate is worth 0. */
    private function rateAmount(mixed $rateId): string
    {
        return $rateId ? (string) Rate::findOrFail($rateId)->hourly_rate : '0.00';
    }

    private function authorizeOwner(Request $request, TimeEntry $timeEntry): void
    {
        abort_unless($timeEntry->user_id === $request->user()->id, 403);
    }

    /**
     * @param  array<int|string>  $values  tag ids, or names of tags to create
     * @return array<int>
     */
    private function resolveTagIds(array $values): array
    {
        $ids = [];

        foreach ($values as $value) {
            if (is_int($value) || ctype_digit((string) $value)) {
                $ids[] = (int) $value;

                continue;
            }

            $name = trim((string) $value);
            $ids[] = Tag::firstOrCreate(['name' => $name], ['color' => Tag::randomColor()])->id;
        }

        // Ignore ids of tags that no longer exist instead of failing the whole save.
        return Tag::whereIn('id', array_unique($ids))->pluck('id')->all();
    }
}
