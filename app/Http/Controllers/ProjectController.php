<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(): Response
    {
        $projects = Project::query()
            ->with('client:id,name')
            ->withCount('timeEntries')
            ->withSum('timeEntries as minutes', 'duration_minutes')
            ->withSum('timeEntries as amount', 'amount')
            ->orderBy('archived')
            ->orderBy('name')
            ->get();

        return Inertia::render('projects/index', [
            'projects' => $projects->map(fn (Project $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'color' => $p->color,
                'hourly_rate' => (float) $p->hourly_rate,
                'archived' => $p->archived,
                'client_id' => $p->client_id,
                'client' => $p->client?->name,
                'entries_count' => $p->time_entries_count,
                'minutes' => (int) $p->minutes,
                'amount' => (float) $p->amount,
            ]),
            'clients' => Client::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Project::create($this->validated($request));

        return back()->with('success', 'Project added.');
    }

    public function update(Request $request, Project $project): RedirectResponse
    {
        $data = $this->validated($request, $project);
        $applyToEntries = $request->boolean('apply_rate_to_entries');

        DB::transaction(function () use ($project, $data, $applyToEntries) {
            $project->update($data);

            // By default entries keep the rate they were saved with; on request,
            // re-price every existing entry of this project with the new rate.
            if ($applyToEntries) {
                $project->timeEntries()->update([
                    'hourly_rate' => $project->hourly_rate,
                    'amount' => DB::raw('ROUND(duration_minutes * '.(float) $project->hourly_rate.' / 60, 2)'),
                ]);
            }
        });

        return back()->with('success', 'Project updated.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        if ($project->timeEntries()->exists()) {
            return back()->with('error', 'This project has time entries. Archive it instead of deleting it.');
        }

        $project->delete();

        return back()->with('success', 'Project deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Project $project = null): array
    {
        return $request->validate([
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('projects', 'name')->where('client_id', $request->input('client_id'))->ignore($project),
            ],
            'hourly_rate' => ['required', 'numeric', 'min:0', 'max:99999999'],
            'color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'archived' => ['boolean'],
        ], [
            'name.unique' => 'A project with this name already exists for the selected client.',
        ], [
            'client_id' => 'client',
            'name' => 'name',
            'hourly_rate' => 'hourly rate',
            'color' => 'color',
        ]);
    }
}
