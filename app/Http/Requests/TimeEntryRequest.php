<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class TimeEntryRequest extends FormRequest
{
    public const MAX_MINUTES = 24 * 60;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'description' => ['nullable', 'string', 'max:5000'],
            'started_at' => ['required', 'date_format:Y-m-d H:i'],
            'ended_at' => ['required', 'date_format:Y-m-d H:i', 'after:started_at', $this->maxDurationRule()],
            'tags' => ['array', 'max:20'],
            // Existing tags arrive as ids; new tags typed in the form arrive as names.
            'tags.*' => ['required', function (string $attribute, mixed $value, Closure $fail) {
                if (is_int($value) || ctype_digit((string) $value)) {
                    return;
                }
                if (! is_string($value) || mb_strlen(trim($value)) === 0 || mb_strlen($value) > 50) {
                    $fail('Each tag must be between 1 and 50 characters.');
                }
            }],
        ];
    }

    public function attributes(): array
    {
        return [
            'project_id' => 'project',
            'description' => 'description',
            'started_at' => 'start',
            'ended_at' => 'end',
            'tags' => 'tags',
        ];
    }

    public function messages(): array
    {
        return [
            'ended_at.after' => 'The end time must be after the start time.',
        ];
    }

    private function maxDurationRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) {
            try {
                $start = Carbon::createFromFormat('Y-m-d H:i', (string) $this->input('started_at'));
                $end = Carbon::createFromFormat('Y-m-d H:i', (string) $value);
            } catch (\Throwable) {
                return; // format errors are reported by the date_format rule
            }

            if ($start->diffInMinutes($end) > self::MAX_MINUTES) {
                $fail('A time entry cannot be longer than 24 hours.');
            }
        };
    }
}
