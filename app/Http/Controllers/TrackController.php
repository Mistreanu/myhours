<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Tag;
use App\Support\EntryPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class TrackController extends Controller
{
    public function index(Request $request): Response
    {
        $date = $this->parseDate($request->query('date'));
        $user = $request->user();

        $entries = $user->timeEntries()
            ->with(['project.client', 'tags'])
            ->whereBetween('started_at', [$date->copy()->startOfDay(), $date->copy()->endOfDay()])
            ->orderBy('started_at')
            ->get();

        $weekStart = $date->copy()->startOfWeek(Carbon::MONDAY);
        $weekTotals = $user->timeEntries()
            ->whereBetween('started_at', [$weekStart, $weekStart->copy()->addDays(6)->endOfDay()])
            ->selectRaw('DATE(started_at) as day, SUM(duration_minutes) as minutes')
            ->groupBy('day')
            ->pluck('minutes', 'day');

        $week = collect(range(0, 6))->map(function (int $offset) use ($weekStart, $weekTotals) {
            $day = $weekStart->copy()->addDays($offset)->toDateString();

            return ['date' => $day, 'minutes' => (int) ($weekTotals[$day] ?? 0)];
        });

        return Inertia::render('track/index', [
            'date' => $date->toDateString(),
            'today' => now()->toDateString(),
            'entries' => $entries->map(EntryPresenter::present(...)),
            'totals' => [
                'minutes' => (int) $entries->sum('duration_minutes'),
                'amount' => (float) $entries->sum('amount'),
            ],
            'week' => $week,
            'projects' => $this->projectOptions(),
            'tags' => Tag::orderBy('name')->get(['id', 'name', 'color']),
        ]);
    }

    private function parseDate(mixed $value): Carbon
    {
        if (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            try {
                return Carbon::createFromFormat('!Y-m-d', $value);
            } catch (\Throwable) {
                // fall through to today
            }
        }

        return now()->startOfDay();
    }

    /**
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function projectOptions()
    {
        return Project::with('client:id,name')
            ->orderBy('archived')
            ->orderBy('name')
            ->get()
            ->map(fn (Project $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'color' => $p->color,
                'hourly_rate' => (float) $p->hourly_rate,
                'archived' => $p->archived,
                'client' => $p->client?->name,
            ]);
    }
}
