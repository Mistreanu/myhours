<?php

use App\Http\Controllers\ClientController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TimeEntryController;
use App\Http\Controllers\TrackController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/track')->name('home');

Route::middleware(['auth'])->group(function () {
    // Auth controllers redirect to "dashboard" after login; Track is the home page.
    Route::redirect('dashboard', '/track')->name('dashboard');

    Route::get('track', [TrackController::class, 'index'])->name('track');

    Route::post('time-entries', [TimeEntryController::class, 'store'])->name('time-entries.store');
    Route::put('time-entries/{timeEntry}', [TimeEntryController::class, 'update'])->name('time-entries.update');
    Route::delete('time-entries/{timeEntry}', [TimeEntryController::class, 'destroy'])->name('time-entries.destroy');

    Route::get('reports/detailed', [ReportController::class, 'index'])->name('reports.detailed');
    Route::get('reports/detailed/export', [ReportController::class, 'export'])->name('reports.export');

    Route::resource('clients', ClientController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('projects', ProjectController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('tags', TagController::class)->only(['index', 'store', 'update', 'destroy']);
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
