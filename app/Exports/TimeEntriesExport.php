<?php

namespace App\Exports;

use App\Models\Tag;
use App\Models\TimeEntry;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Builds the .xlsx export: one sheet with every entry plus a total row,
 * and a second sheet with totals per project.
 */
class TimeEntriesExport
{
    private const HEADER_FILL = '0F766E';

    private const MONEY = '#,##0.00 "RON"';

    private const HOURS = '0.00';

    /**
     * @param  Collection<int, TimeEntry>  $entries  with project.client and tags loaded
     * @param  array<string, mixed>  $filters
     */
    public function __construct(private Collection $entries, private array $filters) {}

    public function write(string $path): void
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setTitle('Timesheet')->setCreator(config('app.name'));
        $spreadsheet->getDefaultStyle()->getFont()->setName('Calibri')->setSize(11);

        $this->buildEntriesSheet($spreadsheet->getActiveSheet());
        $this->buildProjectsSheet($spreadsheet->createSheet());
        $spreadsheet->setActiveSheetIndex(0);

        (new Xlsx($spreadsheet))->save($path);
        $spreadsheet->disconnectWorksheets();
    }

    private function buildEntriesSheet(Worksheet $sheet): void
    {
        $sheet->setTitle('Time entries');

        $sheet->setCellValue('A1', 'Timesheet report');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->setCellValue('A2', $this->periodLabel());
        $sheet->getStyle('A2')->getFont()->getColor()->setRGB('64748B');

        $headers = ['Date', 'Client', 'Project', 'Description', 'Tags', 'Start', 'End', 'Hours', 'Rate (RON/h)', 'Amount (RON)'];
        $headerRow = 4;
        $sheet->fromArray($headers, null, 'A'.$headerRow);
        $this->styleHeader($sheet, 'A'.$headerRow.':J'.$headerRow);

        $row = $headerRow + 1;
        foreach ($this->entries as $entry) {
            $sheet->setCellValue("A{$row}", ExcelDate::PHPToExcel($entry->started_at->copy()->startOfDay()));
            $sheet->setCellValue("B{$row}", $entry->project->client?->name ?? '—');
            $sheet->setCellValue("C{$row}", $entry->project->name);
            $sheet->setCellValue("D{$row}", (string) $entry->description);
            $sheet->setCellValue("E{$row}", $entry->tags->map(fn (Tag $t) => $t->name)->join(', '));
            $sheet->setCellValue("F{$row}", $entry->started_at->format('H:i'));
            $sheet->setCellValue("G{$row}", $entry->ended_at->format('H:i'));
            $sheet->setCellValue("H{$row}", round($entry->duration_minutes / 60, 2));
            $sheet->setCellValue("I{$row}", (float) $entry->hourly_rate);
            // Amount as a formula so edits in Excel stay consistent; matches the app's rounding.
            $sheet->setCellValue("J{$row}", "=ROUND({$entry->duration_minutes}*I{$row}/60,2)");
            $row++;
        }

        $firstData = $headerRow + 1;
        $lastData = max($row - 1, $firstData);
        $totalRow = $row;

        $sheet->setCellValue("A{$totalRow}", 'TOTAL');
        $sheet->setCellValue("D{$totalRow}", $this->entries->count().' entries');
        $sheet->setCellValue("H{$totalRow}", $this->entries->isEmpty() ? 0 : "=SUM(H{$firstData}:H{$lastData})");
        $sheet->setCellValue("J{$totalRow}", $this->entries->isEmpty() ? 0 : "=SUM(J{$firstData}:J{$lastData})");
        $totalStyle = $sheet->getStyle("A{$totalRow}:J{$totalRow}");
        $totalStyle->getFont()->setBold(true);
        $totalStyle->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('ECFDF5');
        $totalStyle->getBorders()->getTop()->setBorderStyle(Border::BORDER_MEDIUM)->getColor()->setRGB(self::HEADER_FILL);

        $sheet->getStyle("A{$firstData}:A{$totalRow}")->getNumberFormat()->setFormatCode('dd/mm/yyyy');
        $sheet->getStyle("H{$firstData}:H{$totalRow}")->getNumberFormat()->setFormatCode(self::HOURS);
        $sheet->getStyle("I{$firstData}:J{$totalRow}")->getNumberFormat()->setFormatCode(self::MONEY);
        $sheet->getStyle("F{$firstData}:G{$totalRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("D{$firstData}:D{$lastData}")->getAlignment()->setWrapText(true)->setVertical(Alignment::VERTICAL_TOP);

        foreach (['A' => 12, 'B' => 22, 'C' => 26, 'D' => 60, 'E' => 22, 'F' => 9, 'G' => 9, 'H' => 9, 'I' => 15, 'J' => 16] as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        $sheet->setAutoFilter("A{$headerRow}:J{$lastData}");
        $sheet->freezePane('A'.($headerRow + 1));
    }

    private function buildProjectsSheet(Worksheet $sheet): void
    {
        $sheet->setTitle('Summary by project');

        $sheet->setCellValue('A1', 'Summary by project');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->setCellValue('A2', $this->periodLabel());
        $sheet->getStyle('A2')->getFont()->getColor()->setRGB('64748B');

        $sheet->fromArray(['Client', 'Project', 'Entries', 'Hours', 'Amount (RON)'], null, 'A4');
        $this->styleHeader($sheet, 'A4:E4');

        $groups = $this->entries->groupBy('project_id')->sortByDesc(fn ($g) => $g->sum('duration_minutes'));

        $row = 5;
        foreach ($groups as $group) {
            $project = $group->first()->project;
            $sheet->setCellValue("A{$row}", $project->client?->name ?? '—');
            $sheet->setCellValue("B{$row}", $project->name);
            $sheet->setCellValue("C{$row}", $group->count());
            $sheet->setCellValue("D{$row}", round($group->sum('duration_minutes') / 60, 2));
            $sheet->setCellValue("E{$row}", round((float) $group->sum('amount'), 2));
            $row++;
        }

        $last = max($row - 1, 5);
        $sheet->setCellValue("A{$row}", 'TOTAL');
        $sheet->setCellValue("C{$row}", $groups->isEmpty() ? 0 : "=SUM(C5:C{$last})");
        $sheet->setCellValue("D{$row}", $groups->isEmpty() ? 0 : "=SUM(D5:D{$last})");
        $sheet->setCellValue("E{$row}", $groups->isEmpty() ? 0 : "=SUM(E5:E{$last})");
        $totalStyle = $sheet->getStyle("A{$row}:E{$row}");
        $totalStyle->getFont()->setBold(true);
        $totalStyle->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('ECFDF5');

        $sheet->getStyle("D5:D{$row}")->getNumberFormat()->setFormatCode(self::HOURS);
        $sheet->getStyle("E5:E{$row}")->getNumberFormat()->setFormatCode(self::MONEY);

        foreach (['A' => 24, 'B' => 30, 'C' => 14, 'D' => 10, 'E' => 18] as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }
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

    private function periodLabel(): string
    {
        $from = $this->filters['from'] ?? null;
        $to = $this->filters['to'] ?? null;
        $fmt = fn (string $d) => \Illuminate\Support\Carbon::parse($d)->format('d/m/Y');

        return match (true) {
            $from && $to => 'Period: '.$fmt($from).' – '.$fmt($to),
            (bool) $from => 'From '.$fmt($from),
            (bool) $to => 'Until '.$fmt($to),
            default => 'All time',
        };
    }
}
