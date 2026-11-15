<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<\App\Models\TimeEntry>
 */
class TimeEntryFactory extends Factory
{
    public function definition(): array
    {
        $start = Carbon::parse(fake()->dateTimeBetween('-30 days', 'now'))->setSecond(0);

        return [
            'user_id' => User::factory(),
            'project_id' => Project::factory(),
            'description' => fake()->sentence(),
            'started_at' => $start,
            'ended_at' => $start->copy()->addMinutes(fake()->numberBetween(15, 240)),
            'hourly_rate' => 100,
        ];
    }
}
