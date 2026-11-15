<?php

namespace App\Http\Controllers;

use App\Exports\TimeEntriesExport;
use App\Models\Client;
use App\Models\Project;
use App\Models\Tag;
use App\Models\TimeEntry;
use App\Support\EntryPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->filters($request);
        $entries = $this->query($request, $filters)->get();

        $byProject = $entries
            ->groupBy('project_id')
            ->map(fn ($group) => [
                'id' => $group->first()->project->id,
                'name' => $group->first()->project->name,
                'color' => $group->first()->project->color,
                'client' => $group->first()->project->client?->name,
                'minutes' => (int) $group->sum('duration_minutes'),
                'amount' => (float) $group->sum('amount'),
            ])
            ->sortByDesc('minutes')
            ->values();

        return Inertia::render('reports/detailed', [
            'filters' => $filters,
            'entries' => $entries->map(EntryPresenter::present(...)),
            'totals' => [
                'count' => $entries->count(),
                'minutes' => (int) $entries->sum('duration_minutes'),
                'amount' => (float) $entries->sum('amount'),
            ],
            'byProject' => $byProject,
            'options' => [
                'clients' => Client::orderBy('name')->get(['id', 'name']),
                'projects' => Project::with('client:id,name')->orderBy('name')->get()->map(fn (Project $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'color' => $p->color,
                    'client' => $p->client?->name,
                ]),
                'tags' => Tag::orderBy('name')->get(['id', 'name', 'color']),
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filters = $this->filters($request);
        $entries = $this->query($request, $filters)->get();

        $filename = sprintf('timesheet_%s_%s.xlsx', $filters['from'] ?? 'start', $filters['to'] ?? now()->toDateString());

        return response()->streamDownload(
            fn () => (new TimeEntriesExport($entries, $filters))->write('php://output'),
            $filename,
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        );
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function query(Request $request, array $filters): Builder
    {
        return TimeEntry::query()
            ->where('user_id', $request->user()->id)
            ->filtered($filters)
            ->with(['project.client', 'tags'])
            ->orderBy('started_at');
    }

    /**
     * Normalise the query string into the filter array used by TimeEntry::scopeFiltered().
     *
     * @return array{from: ?string, to: ?string, clients: array<int>, projects: array<int>, tags: array<int>, search: ?string}
     */
    private function filters(Request $request): array
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
            'all' => ['nullable', 'boolean'],
            'clients' => ['nullable', 'array'],
            'clients.*' => ['integer'],
            'projects' => ['nullable', 'array'],
            'projects.*' => ['integer'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['integer'],
            'search' => ['nullable', 'string', 'max:200'],
        ]);

        // Without an explicit range (and without "all time") the report shows the current month.
        $allTime = (bool) ($validated['all'] ?? false);
        $from = $validated['from'] ?? ($allTime ? null : now()->startOfMonth()->toDateString());
        $to = $validated['to'] ?? ($allTime ? null : now()->endOfMonth()->toDateString());

        if ($from && $to && $from > $to) {
            [$from, $to] = [$to, $from];
        }

        return [
            'from' => $from,
            'to' => $to,
            'clients' => array_map('intval', $validated['clients'] ?? []),
            'projects' => array_map('intval', $validated['projects'] ?? []),
            'tags' => array_map('intval', $validated['tags'] ?? []),
            'search' => $validated['search'] ?? null,
        ];
    }
}
