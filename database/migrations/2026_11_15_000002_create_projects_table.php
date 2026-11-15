<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('name');
            $table->decimal('hourly_rate', 10, 2)->default(0);
            $table->string('color', 7)->default('#10b981');
            $table->boolean('archived')->default(false);
            $table->timestamps();

            $table->unique(['client_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
