<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TagController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('tags/index', [
            'tags' => Tag::query()
                ->withCount('timeEntries')
                ->orderBy('name')
                ->get()
                ->map(fn (Tag $t) => [
                    'id' => $t->id,
                    'name' => $t->name,
                    'color' => $t->color,
                    'entries_count' => $t->time_entries_count,
                ]),
            'palette' => Tag::COLORS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Tag::create($this->validated($request));

        return back()->with('success', 'Tag added.');
    }

    public function update(Request $request, Tag $tag): RedirectResponse
    {
        $tag->update($this->validated($request, $tag));

        return back()->with('success', 'Tag updated.');
    }

    public function destroy(Tag $tag): RedirectResponse
    {
        // The pivot rows cascade, so entries simply lose this tag.
        $tag->delete();

        return back()->with('success', 'Tag deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Tag $tag = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:50', Rule::unique('tags', 'name')->ignore($tag)],
            'color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ], [], ['name' => 'name', 'color' => 'color']);
    }
}
