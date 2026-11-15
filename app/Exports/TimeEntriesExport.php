<?php

namespace App\Exports;

use App\Models\Tag;
use App\Models\TimeEntry;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Builds the .xlsx export: one sheet with every entry plus a total row, and a
 * summary sheet with totals per project and per rate.
 */
class TimeEntriesExport
{
    private const HEADER_FILL = '0F766E';

    private const TOTAL_FILL = 'ECFDF5';

    private const MONEY = '#,##0.00 "RON"';

    private const HOURS = '0.00';

    /**
     * @param  Collection<int, TimeEntry>  $entries  with project.client, rate and tags loaded
     * @param  array<string, mixed>  $filters
     */
    public function __construct(private Collection $entries, private array $filters) {}

    public function write(string $path): void
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setTitle('Timesheet')->setCreator(config('app.name'));
        $spreadsheet->getDefaultStyle()->getFont()->setName('Calibri')->setSize(11);

        $this->buildEntriesSheet($spreadsheet->getActiveSheet());
        $this->buildSummarySheet($spreadsheet->createSheet());
        $spreadsheet->setActiveSheetIndex(0);

        (new Xlsx($spreadsheet))->save($path);
        $spreadsheet->disconnectWorksheets();
    }

    private function buildEntriesSheet(Worksheet $sheet): void
    {
        $sheet->setTitle('Time entries');
        $this->title($sheet, 'Timesheet report');

        $headers = ['Date', 'Client', 'Project', 'Rate', 'Description', 'Tags', 'Start', 'End', 'Hours', 'RON/h', 'Amount (RON)'];
        $headerRow = 4;
        $sheet->fromArray($headers, null, 'A'.$headerRow);
        $this->styleHeader($sheet, "A{$headerRow}:K{$headerRow}");

        $row = $headerRow + 1;
        foreach ($this->entries as $entry) {
            $sheet->setCellValue("A{$row}", ExcelDate::PHPToExcel($entry->started_at->copy()->startOfDay()));
            $sheet->setCellValue("B{$row}", $entry->project->client?->name ?? '—');
            $sheet->setCellValue("C{$row}", $entry->project->name);
            $sheet->setCellValue("D{$row}", $entry->rate?->name ?? '—');
            $sheet->setCellValue("E{$row}", (string) $entry->description);
            $sheet->setCellValue("F{$row}", $entry->tags->map(fn (Tag $t) => $t->name)->join(', '));
            $sheet->setCellValue("G{$row}", $entry->started_at->format('H:i'));
            $sheet->setCellValue("H{$row}", $entry->ended_at->format('H:i'));
            $sheet->setCellValue("I{$row}", round($entry->duration_minutes / 60, 2));
            $sheet->setCellValue("J{$row}", (float) $entry->hourly_rate);
            // Amount as a formula so edits in Excel stay consistent; matches the app's rounding.
            $sheet->setCellValue("K{$row}", "=ROUND({$entry->duration_minutes}*J{$row}/60,2)");
            $row++;
        }

        $firstData = $headerRow + 1;
        $lastData = max($row - 1, $firstData);
        $totalRow = $row;

        $sheet->setCellValue("A{$totalRow}", 'TOTAL');
        $sheet->setCellValue("E{$totalRow}", $this->entries->count().' entries');
        $sheet->setCellValue("I{$totalRow}", $this->entries->isEmpty() ? 0 : "=SUM(I{$firstData}:I{$lastData})");
        $sheet->setCellValue("K{$totalRow}", $this->entries->isEmpty() ? 0 : "=SUM(K{$firstData}:K{$lastData})");
        $this->styleTotal($sheet, "A{$totalRow}:K{$totalRow}");

        $sheet->getStyle("A{$firstData}:A{$totalRow}")->getNumberFormat()->setFormatCode('dd/mm/yyyy');
        $sheet->getStyle("I{$firstData}:I{$totalRow}")->getNumberFormat()->setFormatCode(self::HOURS);
        $sheet->getStyle("J{$firstData}:K{$totalRow}")->getNumberFormat()->setFormatCode(self::MONEY);
        $sheet->getStyle("G{$firstData}:H{$totalRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("E{$firstData}:E{$lastData}")->getAlignment()->setWrapText(true)->setVertical(Alignment::VERTICAL_TOP);

        $widths = ['A' => 12, 'B' => 22, 'C' => 24, 'D' => 20, 'E' => 55, 'F' => 20, 'G' => 8, 'H' => 8, 'I' => 9, 'J' => 14, 'K' => 16];
        foreach ($widths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        $sheet->setAutoFilter("A{$headerRow}:K{$lastData}");
        $sheet->freezePane('A'.($headerRow + 1));
    }

    private function buildSummarySheet(Worksheet $sheet): void
    {
        $sheet->setTitle('Summary');
        $this->title($sheet, 'Summary');

        $byProject = $this->entries
            ->groupBy('project_id')
            ->sortByDesc(fn ($g) => $g->sum('duration_minutes'))
            ->map(fn ($g) => [$g->first()->project->client?->name ?? '—', $g->first()->project->name, $g]);
        $totalRow = $this->summaryTable($sheet, 4, ['Client', 'Project'], $byProject);

        $byRate = $this->entries
            ->groupBy(fn (TimeEntry $e) => $e->rate_id ?? 0)
            ->sortByDesc(fn ($g) => $g->sum('amount'))
            ->map(fn ($g) => [$g->first()->rate?->name ?? 'No rate', (float) ($g->first()->rate?->hourly_rate ?? 0), $g]);
        $this->summaryTable($sheet, $totalRow + 3, ['Rate', 'RON/h'], $byRate, secondIsMoney: true);

        foreach (['A' => 26, 'B' => 30, 'C' => 12, 'D' => 10, 'E' => 18] as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }
    }

    /**
     * Writes a small table: two label columns, then Entries / Hours / Amount, then a TOTAL row.
     * Returns the row number of the TOTAL row.
     *
     * @param  array{0: string, 1: string}  $labels
     * @param  Collection<int|string, array{0: string, 1: string|float, 2: Collection<int, TimeEntry>}>  $groups
     */
    private function summaryTable(Worksheet $sheet, int $headerRow, array $labels, Collection $groups, bool $secondIsMoney = false): int
    {
        $sheet->fromArray([...$labels, 'Entries', 'Hours', 'Amount (RON)'], null, "A{$headerRow}");
        $this->styleHeader($sheet, "A{$headerRow}:E{$headerRow}");

        $row = $headerRow + 1;
        foreach ($groups as [$first, $second, $group]) {
            $sheet->setCellValue("A{$row}", $first);
            $sheet->setCellValue("B{$row}", $second);
            $sheet->setCellValue("C{$row}", $group->count());
            $sheet->setCellValue("D{$row}", round($group->sum('duration_minutes') / 60, 2));
            $sheet->setCellValue("E{$row}", round((float) $group->sum('amount'), 2));
            $row++;
        }

        $first = $headerRow + 1;
        $last = max($row - 1, $first);
        $sheet->setCellValue("A{$row}", 'TOTAL');
        foreach (['C', 'D', 'E'] as $col) {
            $sheet->setCellValue("{$col}{$row}", $groups->isEmpty() ? 0 : "=SUM({$col}{$first}:{$col}{$last})");
        }
        $this->styleTotal($sheet, "A{$row}:E{$row}");

        $sheet->getStyle("D{$first}:D{$row}")->getNumberFormat()->setFormatCode(self::HOURS);
        $sheet->getStyle("E{$first}:E{$row}")->getNumberFormat()->setFormatCode(self::MONEY);
        if ($secondIsMoney) {
            $sheet->getStyle("B{$first}:B{$last}")->getNumberFormat()->setFormatCode(self::MONEY);
            $sheet->getStyle("B{$first}:B{$last}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
        }

        return $row;
    }

    private function title(Worksheet $sheet, string $title): void
    {
        $sheet->setCellValue('A1', $title);
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->setCellValue('A2', $this->periodLabel());
        $sheet->getStyle('A2')->getFont()->getColor()->setRGB('64748B');
    }

    private function styleHeader(Worksheet $sheet, string $range): void
    {
        $style = $sheet->getStyle($range);
        $style->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $style->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::HEADER_FILL);
        $style->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
        [$start] = explode(':', $range);
        $sheet->getRowDimension((int) preg_replace('/\D/', '', $start))->setRowHeight(22);
    }

    private function styleTotal(Worksheet $sheet, string $range): void
    {
        $style = $sheet->getStyle($range);
        $style->getFont()->setBold(true);
        $style->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::TOTAL_FILL);
        $style->getBorders()->getTop()->setBorderStyle(Border::BORDER_MEDIUM)->getColor()->setRGB(self::HEADER_FILL);
    }

    private function periodLabel(): string
    {
        $from = $this->filters['from'] ?? null;
        $to = $this->filters['to'] ?? null;
        $fmt = fn (string $d) => Carbon::parse($d)->format('d/m/Y');

        return match (true) {
            $from && $to => 'Period: '.$fmt($from).' – '.$fmt($to),
            (bool) $from => 'From '.$fmt($from),
            (bool) $to => 'Until '.$fmt($to),
            default => 'All time',
        };
    }
}
