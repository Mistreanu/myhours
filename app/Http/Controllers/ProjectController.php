<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Project;
use App\Models\Rate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(): Response
    {
        $projects = Project::query()
            ->with(['client:id,name', 'defaultRate:id,name,hourly_rate'])
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
                'archived' => $p->archived,
                'client_id' => $p->client_id,
                'client' => $p->client?->name,
                'default_rate_id' => $p->default_rate_id,
                'default_rate' => $p->defaultRate ? ['name' => $p->defaultRate->name, 'hourly_rate' => (float) $p->defaultRate->hourly_rate] : null,
                'entries_count' => $p->time_entries_count,
                'minutes' => (int) $p->minutes,
                'amount' => (float) $p->amount,
            ]),
            'clients' => Client::orderBy('name')->get(['id', 'name']),
            'rates' => Rate::options($projects->pluck('default_rate_id')->all()),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Project::create($this->validated($request));

        return back()->with('success', 'Project added.');
    }

    public function update(Request $request, Project $project): RedirectResponse
    {
        $project->update($this->validated($request, $project));

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
            'default_rate_id' => ['nullable', 'integer', 'exists:rates,id'],
            'color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'archived' => ['boolean'],
        ], [
            'name.unique' => 'A project with this name already exists for the selected client.',
        ], [
            'client_id' => 'client',
            'name' => 'name',
            'default_rate_id' => 'default rate',
            'color' => 'color',
        ]);
    }
}
