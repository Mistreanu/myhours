<?php

namespace Database\Factories;

use App\Models\Client;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Project>
 */
class ProjectFactory extends Factory
{
    public function definition(): array
    {
        return [
            'client_id' => Client::factory(),
            'name' => fake()->unique()->words(2, true),
            'hourly_rate' => 100,
            'color' => fake()->hexColor(),
            'archived' => false,
        ];
    }
}
