<?php

namespace Tests\Feature;

use App\Models\Rate;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateTest extends TestCase
{
    use RefreshDatabase;

    public function test_rates_page_renders(): void
    {
        $user = User::factory()->create();
        Rate::factory()->create(['name' => 'Programming']);

        $this->actingAs($user)->get('/rates')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('rates/index')->has('rates', 1));
    }

    public function test_rates_can_be_created_and_names_are_unique(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/rates', ['name' => 'Content editing', 'hourly_rate' => '50'])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('rates', ['name' => 'Content editing', 'hourly_rate' => 50]);

        $this->actingAs($user)->post('/rates', ['name' => 'Content editing', 'hourly_rate' => '60'])->assertSessionHasErrors('name');
        $this->actingAs($user)->post('/rates', ['name' => 'Image', 'hourly_rate' => '-1'])->assertSessionHasErrors('hourly_rate');
    }

    public function test_changing_the_amount_only_reprices_entries_when_asked(): void
    {
        $user = User::factory()->create();
        $rate = Rate::factory()->create(['name' => 'Programming', 'hourly_rate' => 100]);
        $entry = TimeEntry::factory()->for($user)->create([
            'rate_id' => $rate->id, 'started_at' => '2026-11-14 08:00', 'ended_at' => '2026-11-14 10:00', 'hourly_rate' => 100,
        ]);

        $this->actingAs($user)->put("/rates/{$rate->id}", ['name' => 'Programming', 'hourly_rate' => 150])->assertSessionHasNoErrors();
        $this->assertSame('200.00', $entry->fresh()->amount);

        $this->actingAs($user)->put("/rates/{$rate->id}", ['name' => 'Programming', 'hourly_rate' => 150, 'apply_to_entries' => true]);
        $this->assertSame('150.00', $entry->fresh()->hourly_rate);
        $this->assertSame('300.00', $entry->fresh()->amount);
    }

    public function test_rates_in_use_cannot_be_deleted_but_can_be_archived(): void
    {
        $user = User::factory()->create();
        $rate = Rate::factory()->create();
        TimeEntry::factory()->for($user)->create(['rate_id' => $rate->id]);
        $unused = Rate::factory()->create();

        $this->actingAs($user)->delete("/rates/{$rate->id}")->assertSessionHas('error');
        $this->assertDatabaseHas('rates', ['id' => $rate->id]);

        $this->actingAs($user)->put("/rates/{$rate->id}", ['name' => $rate->name, 'hourly_rate' => 100, 'archived' => true]);
        $this->assertTrue($rate->fresh()->archived);

        $this->actingAs($user)->delete("/rates/{$unused->id}")->assertSessionHas('success');
        $this->assertDatabaseMissing('rates', ['id' => $unused->id]);
    }
}
