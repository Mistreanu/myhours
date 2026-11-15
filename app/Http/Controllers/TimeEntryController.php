<?php

namespace App\Http\Controllers;

use App\Http\Requests\TimeEntryRequest;
use App\Models\Project;
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
            $project = Project::findOrFail($request->integer('project_id'));

            $entry = $request->user()->timeEntries()->create([
                ...$request->safe()->only(['project_id', 'description', 'started_at', 'ended_at']),
                'hourly_rate' => $project->hourly_rate,
            ]);

            $entry->tags()->sync($this->resolveTagIds($request->input('tags', [])));
        });

        return back()->with('success', 'Time entry added.');
    }

    public function update(TimeEntryRequest $request, TimeEntry $timeEntry): RedirectResponse
    {
        $this->authorizeOwner($request, $timeEntry);

        DB::transaction(function () use ($request, $timeEntry) {
            $timeEntry->fill($request->safe()->only(['project_id', 'description', 'started_at', 'ended_at']));

            // Moving an entry to another project re-prices it with that project's rate;
            // otherwise the rate saved with the entry is kept.
            if ($timeEntry->isDirty('project_id')) {
                $timeEntry->hourly_rate = Project::findOrFail($timeEntry->project_id)->hourly_rate;
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
