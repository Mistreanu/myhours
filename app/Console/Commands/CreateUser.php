<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

/**
 * Public registration is disabled, so accounts are created from the terminal.
 * Running it for an existing email resets that user's password.
 */
class CreateUser extends Command
{
    protected $signature = 'user:create {--name=} {--email=}';

    protected $description = 'Create the user account (or reset the password of an existing email)';

    public function handle(): int
    {
        $name = $this->option('name') ?: text('Name', required: true);
        $email = $this->option('email') ?: text('Email', required: true);
        $pass = password('Password (min. 8 characters)', required: true);
        $confirm = password('Confirm password', required: true);

        $validator = Validator::make(
            ['name' => $name, 'email' => $email, 'password' => $pass, 'password_confirmation' => $confirm],
            [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255'],
                'password' => ['required', 'confirmed', Password::min(8)],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = User::updateOrCreate(
            ['email' => strtolower($email)],
            ['name' => $name, 'password' => $pass],
        );

        $this->info($user->wasRecentlyCreated
            ? "Account created for {$user->email}. You can log in now."
            : "Password updated for {$user->email}.");

        return self::SUCCESS;
    }
}
