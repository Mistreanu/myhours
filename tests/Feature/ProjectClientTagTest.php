<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Project;
use App\Models\Tag;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectClientTagTest extends TestCase
{
    use RefreshDatabase;

    public function test_management_pages_render(): void
    {
        $user = User::factory()->create();
        TimeEntry::factory()->for($user)->create();

        foreach (['/projects' => 'projects/index', '/clients' => 'clients/index', '/tags' => 'tags/index'] as $url => $component) {
            $this->actingAs($user)->get($url)->assertOk()->assertInertia(fn ($page) => $page->component($component));
        }
    }

    public function test_a_project_can_be_created_with_a_client_and_rate(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create();

        $this->actingAs($user)->post('/projects', [
            'name' => 'Website',
            'client_id' => $client->id,
            'hourly_rate' => '125.50',
            'color' => '#10b981',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('projects', ['name' => 'Website', 'client_id' => $client->id, 'hourly_rate' => 125.50]);
    }

    public function test_changing_a_rate_only_reprices_entries_when_asked(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['hourly_rate' => 100]);
        $entry = TimeEntry::factory()->for($user)->for($project)->create([
            'started_at' => '2026-11-14 08:00', 'ended_at' => '2026-11-14 10:00', 'hourly_rate' => 100,
        ]);
        $data = ['name' => $project->name, 'client_id' => $project->client_id, 'color' => $project->color];

        $this->actingAs($user)->put("/projects/{$project->id}", [...$data, 'hourly_rate' => 150])->assertSessionHasNoErrors();
        $this->assertSame('200.00', $entry->fresh()->amount);

        $this->actingAs($user)->put("/projects/{$project->id}", [...$data, 'hourly_rate' => 150, 'apply_rate_to_entries' => true]);
        $this->assertSame('150.00', $entry->fresh()->hourly_rate);
        $this->assertSame('300.00', $entry->fresh()->amount);
    }

    public function test_projects_with_entries_cannot_be_deleted_but_can_be_archived(): void
    {
        $user = User::factory()->create();
        $entry = TimeEntry::factory()->for($user)->create();
        $project = $entry->project;

        $this->actingAs($user)->delete("/projects/{$project->id}")->assertSessionHas('error');
        $this->assertDatabaseHas('projects', ['id' => $project->id]);

        $this->actingAs($user)->put("/projects/{$project->id}", [
            'name' => $project->name, 'client_id' => $project->client_id, 'hourly_rate' => 100, 'color' => '#10b981', 'archived' => true,
        ])->assertSessionHasNoErrors();
        $this->assertTrue($project->fresh()->archived);
    }

    public function test_clients_with_projects_cannot_be_deleted(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();
        $empty = Client::factory()->create();

        $this->actingAs($user)->delete("/clients/{$project->client_id}")->assertSessionHas('error');
        $this->assertDatabaseHas('clients', ['id' => $project->client_id]);

        $this->actingAs($user)->delete("/clients/{$empty->id}")->assertSessionHas('success');
        $this->assertDatabaseMissing('clients', ['id' => $empty->id]);
    }

    public function test_client_names_are_unique(): void
    {
        $user = User::factory()->create();
        Client::factory()->create(['name' => 'Acme']);

        $this->actingAs($user)->post('/clients', ['name' => 'Acme'])->assertSessionHasErrors('name');
    }

    public function test_deleting_a_tag_keeps_the_entries(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->create();
        $entry = TimeEntry::factory()->for($user)->create();
        $entry->tags()->attach($tag);

        $this->actingAs($user)->delete("/tags/{$tag->id}")->assertSessionHas('success');

        $this->assertDatabaseHas('time_entries', ['id' => $entry->id]);
        $this->assertCount(0, $entry->fresh()->tags);
    }

    public function test_registration_is_disabled(): void
    {
        $this->get('/register')->assertNotFound();
        $this->post('/register', ['name' => 'x', 'email' => 'x@example.com', 'password' => 'password', 'password_confirmation' => 'password'])->assertNotFound();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_user_create_command_creates_an_account(): void
    {
        $this->artisan('user:create', ['--name' => 'Test Person', '--email' => 'Person@Example.com'])
            ->expectsQuestion('Password (min. 8 characters)', 'a-long-password')
            ->expectsQuestion('Confirm password', 'a-long-password')
            ->assertSuccessful();

        $this->post('/login', ['email' => 'person@example.com', 'password' => 'a-long-password']);
        $this->assertAuthenticated();
    }
}
