<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * A UTF-8 BOM before "<?php" is sent to the browser as output. It corrupted the
 * Excel download once (the .xlsx no longer started with "PK"), so guard against it.
 */
class NoByteOrderMarkTest extends TestCase
{
    public function test_php_files_have_no_utf8_bom(): void
    {
        $root = dirname(__DIR__, 2);
        $offenders = [];

        foreach (['app', 'bootstrap', 'config', 'database', 'routes', 'lang'] as $dir) {
            if (! is_dir("{$root}/{$dir}")) {
                continue;
            }

            $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator("{$root}/{$dir}", RecursiveDirectoryIterator::SKIP_DOTS));
            foreach ($files as $file) {
                if ($file->getExtension() === 'php' && file_get_contents($file->getPathname(), false, null, 0, 3) === "\xEF\xBB\xBF") {
                    $offenders[] = substr($file->getPathname(), strlen($root) + 1);
                }
            }
        }

        $this->assertSame([], $offenders, 'These files start with a UTF-8 BOM: '.implode(', ', $offenders));
    }
}
