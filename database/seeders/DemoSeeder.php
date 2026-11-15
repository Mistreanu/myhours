<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Project;
use App\Models\Tag;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Local demo data only — never run this on a real installation.
 * Demo login: demo@myhours.test / demo-password-123
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(['email' => 'demo@myhours.test'], ['name' => 'Demo User', 'password' => 'demo-password-123']);

        $acme = Client::firstOrCreate(['name' => 'Acme SRL']);
        $north = Client::firstOrCreate(['name' => 'Northwind']);

        $projects = [
            Project::firstOrCreate(['client_id' => $acme->id, 'name' => 'Website redesign'], ['hourly_rate' => 120, 'color' => '#10b981']),
            Project::firstOrCreate(['client_id' => $acme->id, 'name' => 'Maintenance'], ['hourly_rate' => 90, 'color' => '#0ea5e9']),
            Project::firstOrCreate(['client_id' => $north->id, 'name' => 'Booking app'], ['hourly_rate' => 150, 'color' => '#8b5cf6']),
            Project::firstOrCreate(['client_id' => null, 'name' => 'Internal'], ['hourly_rate' => 0, 'color' => '#64748b']),
        ];

        $tags = collect(['development', 'meeting', 'bugfix', 'design'])
            ->map(fn (string $name, int $i) => Tag::firstOrCreate(['name' => $name], ['color' => Tag::COLORS[$i]]));

        $descriptions = [
            'Implemented the new reservation time calculation',
            'Client call about the deposit login flow',
            'Fixed validation on the checkout form',
            'Reviewed design mockups and gave feedback',
            'Refactored the reporting queries',
        ];

        $day = now()->startOfDay()->subDays(20);
        while ($day->lte(now())) {
            if (! $day->isWeekend()) {
                $start = $day->copy()->setTime(8, 30);
                foreach (range(1, rand(2, 3)) as $_) {
                    $project = $projects[array_rand($projects)];
                    $end = $start->copy()->addMinutes(rand(3, 10) * 15);
                    $entry = TimeEntry::create([
                        'user_id' => $user->id,
                        'project_id' => $project->id,
                        'description' => $descriptions[array_rand($descriptions)],
                        'started_at' => $start,
                        'ended_at' => $end,
                        'hourly_rate' => $project->hourly_rate,
                    ]);
                    $entry->tags()->sync($tags->random(rand(1, 2))->pluck('id'));
                    $start = $end->copy()->addMinutes(30);
                }
            }
            $day = Carbon::parse($day)->addDay();
        }
    }
}
