<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Tag;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimeEntryTest extends TestCase
{
    use RefreshDatabase;

    private function payload(Project $project, array $overrides = []): array
    {
        return array_merge([
            'project_id' => $project->id,
            'description' => 'Fixed the login page',
            'started_at' => '2026-11-14 07:30',
            'ended_at' => '2026-11-14 09:00',
            'tags' => [],
        ], $overrides);
    }

    public function test_guests_cannot_see_the_track_page(): void
    {
        $this->get('/track')->assertRedirect('/login');
    }

    public function test_track_page_lists_only_the_selected_day(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();
        TimeEntry::factory()->for($user)->for($project)->create(['started_at' => '2026-11-14 08:00', 'ended_at' => '2026-11-14 10:00']);
        TimeEntry::factory()->for($user)->for($project)->create(['started_at' => '2026-11-13 08:00', 'ended_at' => '2026-11-13 09:00']);

        $this->actingAs($user)
            ->get('/track?date=2026-11-14')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('track/index')
                ->where('date', '2026-11-14')
                ->has('entries', 1)
                ->where('totals.minutes', 120)
                ->has('week', 7));
    }

    public function test_creating_an_entry_uses_the_project_rate_and_computes_the_amount(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['hourly_rate' => 100]);

        $this->actingAs($user)->post('/time-entries', $this->payload($project))->assertRedirect();

        $entry = TimeEntry::sole();
        $this->assertSame($user->id, $entry->user_id);
        $this->assertSame(90, $entry->duration_minutes);
        $this->assertSame('100.00', $entry->hourly_rate);
        $this->assertSame('150.00', $entry->amount);
    }

    public function test_entries_can_end_after_midnight(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['hourly_rate' => 60]);

        $this->actingAs($user)->post('/time-entries', $this->payload($project, [
            'started_at' => '2026-11-14 23:00',
            'ended_at' => '2026-11-15 01:30',
        ]))->assertSessionHasNoErrors();

        $this->assertSame(150, TimeEntry::sole()->duration_minutes);
        $this->assertSame('150.00', TimeEntry::sole()->amount);
    }

    public function test_end_must_be_after_start_and_within_24_hours(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $this->actingAs($user)
            ->post('/time-entries', $this->payload($project, ['ended_at' => '2026-11-14 07:00']))
            ->assertSessionHasErrors('ended_at');

        $this->actingAs($user)
            ->post('/time-entries', $this->payload($project, ['ended_at' => '2026-11-15 08:00']))
            ->assertSessionHasErrors('ended_at');

        $this->assertDatabaseCount('time_entries', 0);
    }

    public function test_tags_can_be_existing_ids_or_new_names(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();
        $existing = Tag::factory()->create(['name' => 'development']);

        $this->actingAs($user)->post('/time-entries', $this->payload($project, [
            'tags' => [$existing->id, 'meeting', 'meeting'],
        ]))->assertSessionHasNoErrors();

        $this->assertDatabaseCount('tags', 2);
        $this->assertEqualsCanonicalizing(['development', 'meeting'], TimeEntry::sole()->tags->pluck('name')->all());
    }

    public function test_updating_keeps_the_saved_rate_unless_the_project_changes(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['hourly_rate' => 100]);
        $other = Project::factory()->create(['hourly_rate' => 200]);

        $this->actingAs($user)->post('/time-entries', $this->payload($project));
        $entry = TimeEntry::sole();
        $project->update(['hourly_rate' => 150]);

        // Same project, longer: old rate is kept.
        $this->actingAs($user)->put("/time-entries/{$entry->id}", $this->payload($project, ['ended_at' => '2026-11-14 09:30']));
        $entry->refresh();
        $this->assertSame('100.00', $entry->hourly_rate);
        $this->assertSame('200.00', $entry->amount);

        // Moved to another project: re-priced with that project's rate.
        $this->actingAs($user)->put("/time-entries/{$entry->id}", $this->payload($other, ['ended_at' => '2026-11-14 09:30']));
        $entry->refresh();
        $this->assertSame('200.00', $entry->hourly_rate);
        $this->assertSame('400.00', $entry->amount);
    }

    public function test_users_cannot_touch_entries_of_other_users(): void
    {
        $entry = TimeEntry::factory()->create();
        $intruder = User::factory()->create();

        $this->actingAs($intruder)->put("/time-entries/{$entry->id}", $this->payload($entry->project))->assertForbidden();
        $this->actingAs($intruder)->delete("/time-entries/{$entry->id}")->assertForbidden();
        $this->assertDatabaseHas('time_entries', ['id' => $entry->id]);
    }

    public function test_entries_can_be_deleted(): void
    {
        $user = User::factory()->create();
        $entry = TimeEntry::factory()->for($user)->create();

        $this->actingAs($user)->delete("/time-entries/{$entry->id}")->assertRedirect();

        $this->assertDatabaseMissing('time_entries', ['id' => $entry->id]);
    }
}
