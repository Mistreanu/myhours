<?php

namespace App\Http\Controllers;

use App\Models\Rate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RateController extends Controller
{
    public function index(): Response
    {
        $rates = Rate::query()
            ->withCount('timeEntries')
            ->withSum('timeEntries as minutes', 'duration_minutes')
            ->withSum('timeEntries as amount', 'amount')
            ->orderBy('archived')
            ->orderBy('name')
            ->get();

        return Inertia::render('rates/index', [
            'rates' => $rates->map(fn (Rate $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'hourly_rate' => (float) $r->hourly_rate,
                'archived' => $r->archived,
                'entries_count' => $r->time_entries_count,
                'minutes' => (int) $r->minutes,
                'amount' => (float) $r->amount,
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Rate::create($this->validated($request));

        return back()->with('success', 'Rate added.');
    }

    public function update(Request $request, Rate $rate): RedirectResponse
    {
        $data = $this->validated($request, $rate);
        $applyToEntries = $request->boolean('apply_to_entries');

        DB::transaction(function () use ($rate, $data, $applyToEntries) {
            $rate->update($data);

            // Entries keep the amount they were saved with unless asked to re-price them.
            if ($applyToEntries) {
                $rate->timeEntries()->update([
                    'hourly_rate' => $rate->hourly_rate,
                    'amount' => DB::raw('ROUND(duration_minutes * '.(float) $rate->hourly_rate.' / 60, 2)'),
                ]);
            }
        });

        return back()->with('success', 'Rate updated.');
    }

    public function destroy(Rate $rate): RedirectResponse
    {
        if ($rate->timeEntries()->exists()) {
            return back()->with('error', 'This rate is used by time entries. Archive it instead of deleting it.');
        }

        $rate->delete();

        return back()->with('success', 'Rate deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Rate $rate = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('rates', 'name')->ignore($rate)],
            'hourly_rate' => ['required', 'numeric', 'min:0', 'max:99999999'],
            'archived' => ['boolean'],
        ], [], ['name' => 'name', 'hourly_rate' => 'hourly rate']);
    }
}
