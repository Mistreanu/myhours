<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Project;
use App\Models\Rate;
use App\Models\Tag;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Local demo data only — never run this on a real installation.
 * Demo login: demo@myhours.test / demo-password-123
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(['email' => 'demo@myhours.test'], ['name' => 'Demo User', 'password' => 'demo-password-123']);

        $rates = [
            'editing' => Rate::firstOrCreate(['name' => 'Content editing'], ['hourly_rate' => 50]),
            'programming' => Rate::firstOrCreate(['name' => 'Programming'], ['hourly_rate' => 100]),
            'image' => Rate::firstOrCreate(['name' => 'Image editing'], ['hourly_rate' => 70]),
        ];

        $acme = Client::firstOrCreate(['name' => 'Acme SRL']);
        $north = Client::firstOrCreate(['name' => 'Northwind']);

        $projects = [
            Project::firstOrCreate(['client_id' => $acme->id, 'name' => 'Website redesign'], ['default_rate_id' => $rates['programming']->id, 'color' => '#10b981']),
            Project::firstOrCreate(['client_id' => $acme->id, 'name' => 'Blog'], ['default_rate_id' => $rates['editing']->id, 'color' => '#0ea5e9']),
            Project::firstOrCreate(['client_id' => $north->id, 'name' => 'Booking app'], ['default_rate_id' => $rates['programming']->id, 'color' => '#8b5cf6']),
            Project::firstOrCreate(['client_id' => null, 'name' => 'Internal'], ['color' => '#64748b']),
        ];

        $tags = collect(['development', 'meeting', 'bugfix', 'design'])
            ->map(fn (string $name, int $i) => Tag::firstOrCreate(['name' => $name], ['color' => Tag::COLORS[$i]]));

        $descriptions = [
            'Implemented the new reservation time calculation',
            'Client call about the deposit login flow',
            'Fixed validation on the checkout form',
            'Edited product photos for the landing page',
            'Wrote and edited the November newsletter',
        ];

        $day = now()->startOfDay()->subDays(20);
        while ($day->lte(now())) {
            if (! $day->isWeekend()) {
                $start = $day->copy()->setTime(8, 30);
                foreach (range(1, rand(2, 3)) as $_) {
                    $project = $projects[array_rand($projects)];
                    // Mostly the project's default rate, sometimes another one (same project, different work).
                    $rate = $project->default_rate_id && rand(0, 3) > 0
                        ? Rate::find($project->default_rate_id)
                        : ($project->name === 'Internal' ? null : $rates[array_rand($rates)]);
                    $end = $start->copy()->addMinutes(rand(3, 10) * 15);

                    $entry = TimeEntry::create([
                        'user_id' => $user->id,
                        'project_id' => $project->id,
                        'rate_id' => $rate?->id,
                        'description' => $descriptions[array_rand($descriptions)],
                        'started_at' => $start,
                        'ended_at' => $end,
                        'hourly_rate' => $rate?->hourly_rate ?? 0,
                    ]);
                    $entry->tags()->sync($tags->random(rand(1, 2))->pluck('id'));
                    $start = $end->copy()->addMinutes(30);
                }
            }
            $day = $day->copy()->addDay();
        }
    }
}
