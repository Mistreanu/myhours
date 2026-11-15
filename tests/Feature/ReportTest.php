<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Project;
use App\Models\Tag;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Project $alpha;

    private Project $beta;

    private Tag $meeting;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $client = Client::factory()->create(['name' => 'Acme']);
        $this->alpha = Project::factory()->for($client)->create(['name' => 'Alpha', 'hourly_rate' => 100]);
        $this->beta = Project::factory()->create(['name' => 'Beta', 'hourly_rate' => 50]);
        $this->meeting = Tag::factory()->create(['name' => 'meeting']);

        // Alpha: 2h on Nov 10 (tagged meeting) + 1h30 on Nov 12; Beta: 3h on Nov 11; Alpha 1h in October.
        $this->entry($this->alpha, '2026-11-10 08:00', '2026-11-10 10:00')->tags()->attach($this->meeting);
        $this->entry($this->alpha, '2026-11-12 13:00', '2026-11-12 14:30');
        $this->entry($this->beta, '2026-11-11 09:00', '2026-11-11 12:00');
        $this->entry($this->alpha, '2026-10-20 09:00', '2026-10-20 10:00');
    }

    private function entry(Project $project, string $start, string $end): TimeEntry
    {
        return TimeEntry::factory()->for($this->user)->for($project)->create([
            'started_at' => $start, 'ended_at' => $end, 'hourly_rate' => $project->hourly_rate,
        ]);
    }

    public function test_report_totals_for_a_date_range(): void
    {
        $this->actingAs($this->user)
            ->get('/reports/detailed?from=2026-11-01&to=2026-11-30')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('reports/detailed')
                ->has('entries', 3)
                ->where('totals.minutes', 390)
                ->where('totals.amount', 500)
                ->has('byProject', 2));
    }

    public function test_report_filters_by_project_client_and_tag(): void
    {
        $base = '/reports/detailed?from=2026-11-01&to=2026-11-30';

        $this->actingAs($this->user)->get($base.'&projects[]='.$this->beta->id)
            ->assertInertia(fn ($page) => $page->has('entries', 1)->where('totals.amount', 150));

        $this->actingAs($this->user)->get($base.'&clients[]='.$this->alpha->client_id)
            ->assertInertia(fn ($page) => $page->has('entries', 2)->where('totals.minutes', 210));

        $this->actingAs($this->user)->get($base.'&tags[]='.$this->meeting->id)
            ->assertInertia(fn ($page) => $page->has('entries', 1)->where('totals.amount', 200));
    }

    public function test_all_time_report_ignores_the_default_month(): void
    {
        $this->actingAs($this->user)->get('/reports/detailed?all=1')
            ->assertInertia(fn ($page) => $page->has('entries', 4)->where('filters.from', null));
    }

    public function test_excel_export_contains_every_entry_and_the_total(): void
    {
        $response = $this->actingAs($this->user)->get('/reports/detailed/export?from=2026-11-01&to=2026-11-30');

        $response->assertOk();
        $this->assertStringContainsString('timesheet_2026-11-01_2026-11-30.xlsx', $response->headers->get('content-disposition'));

        $path = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($path, $response->streamedContent());
        $sheet = IOFactory::load($path)->getSheet(0);
        unlink($path);

        $this->assertSame('Date', $sheet->getCell('A4')->getValue());
        $this->assertSame('Alpha', $sheet->getCell('C5')->getValue());
        $this->assertSame('TOTAL', $sheet->getCell('A8')->getValue());
        $this->assertEqualsWithDelta(6.5, $sheet->getCell('H8')->getCalculatedValue(), 0.001);
        $this->assertEqualsWithDelta(500, $sheet->getCell('J8')->getCalculatedValue(), 0.001);
    }
}
