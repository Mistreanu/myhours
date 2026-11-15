<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->restrictOnDelete();
            $table->text('description')->nullable();
            $table->dateTime('started_at');
            $table->dateTime('ended_at');
            $table->unsignedInteger('duration_minutes');
            // The rate is copied from the project when the entry is saved, so a
            // later rate change does not silently rewrite already billed work.
            $table->decimal('hourly_rate', 10, 2);
            $table->decimal('amount', 12, 2);
            $table->timestamps();

            $table->index(['user_id', 'started_at']);
        });

        Schema::create('tag_time_entry', function (Blueprint $table) {
            $table->foreignId('time_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->primary(['time_entry_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tag_time_entry');
        Schema::dropIfExists('time_entries');
    }
};
