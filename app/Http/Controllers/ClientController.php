<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\TimeEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function index(): Response
    {
        $clients = Client::query()
            ->withCount('projects')
            ->orderBy('name')
            ->get();

        // Total tracked time and amount per client, across all of its projects.
        $totals = TimeEntry::query()
            ->join('projects', 'projects.id', '=', 'time_entries.project_id')
            ->whereNotNull('projects.client_id')
            ->selectRaw('projects.client_id, SUM(time_entries.duration_minutes) as minutes, SUM(time_entries.amount) as amount')
            ->groupBy('projects.client_id')
            ->get()
            ->keyBy('client_id');

        return Inertia::render('clients/index', [
            'clients' => $clients->map(fn (Client $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'notes' => $c->notes,
                'projects_count' => $c->projects_count,
                'minutes' => (int) ($totals[$c->id]->minutes ?? 0),
                'amount' => (float) ($totals[$c->id]->amount ?? 0),
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Client::create($this->validated($request));

        return back()->with('success', 'Client added.');
    }

    public function update(Request $request, Client $client): RedirectResponse
    {
        $client->update($this->validated($request, $client));

        return back()->with('success', 'Client updated.');
    }

    public function destroy(Client $client): RedirectResponse
    {
        if ($client->projects()->exists()) {
            return back()->with('error', 'This client still has projects. Move or delete them first.');
        }

        $client->delete();

        return back()->with('success', 'Client deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Client $client = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('clients', 'name')->ignore($client)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ], [], ['name' => 'name', 'notes' => 'notes']);
    }
}
