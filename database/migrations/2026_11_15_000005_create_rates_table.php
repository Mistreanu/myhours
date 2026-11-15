<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Hourly rates become a global, named list (e.g. "Programming – 100 RON/h") that any
 * time entry can use. Projects keep only an optional default rate.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rates', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->decimal('hourly_rate', 10, 2);
            $table->boolean('archived')->default(false);
            $table->timestamps();
        });

        Schema::table('time_entries', function (Blueprint $table) {
            $table->foreignId('rate_id')->nullable()->after('project_id')->constrained()->restrictOnDelete();
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->foreignId('default_rate_id')->nullable()->after('client_id')->constrained('rates')->nullOnDelete();
        });

        // Turn each distinct project rate into a named rate, so existing data keeps its prices.
        $amounts = DB::table('projects')->where('hourly_rate', '>', 0)->distinct()->pluck('hourly_rate');
        foreach ($amounts as $amount) {
            $rateId = DB::table('rates')->insertGetId([
                'name' => 'Rate '.number_format((float) $amount, 2, '.', '').' RON',
                'hourly_rate' => $amount,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('projects')->where('hourly_rate', $amount)->update(['default_rate_id' => $rateId]);
            DB::table('time_entries')->where('hourly_rate', $amount)->update(['rate_id' => $rateId]);
        }

        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('hourly_rate');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->decimal('hourly_rate', 10, 2)->default(0)->after('name');
        });

        DB::table('projects')->whereNotNull('default_rate_id')->get(['id', 'default_rate_id'])->each(function ($project) {
            DB::table('projects')->where('id', $project->id)->update([
                'hourly_rate' => DB::table('rates')->where('id', $project->default_rate_id)->value('hourly_rate'),
            ]);
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropConstrainedForeignId('default_rate_id');
        });

        Schema::table('time_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('rate_id');
        });

        Schema::dropIfExists('rates');
    }
};
