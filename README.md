# My Hours

A personal time tracker: clients, projects, named hourly rates (RON), time entries with
start/end time, rate, description and tags, a detailed report with filters, and Excel export.

Built with Laravel 12, Inertia + React 19, Tailwind CSS 4 and MySQL/MariaDB.

## Setup

```bash
composer install
npm install
cp .env.example .env        # then fill in DB_PASSWORD
php artisan key:generate
php artisan migrate
npm run build
```

Public registration is disabled. Create (or later reset) your account from the terminal:

```bash
php artisan user:create
```

## Run

```bash
php artisan serve
```

Then open http://127.0.0.1:8000. During frontend development use `composer run dev`
(Laravel server + Vite with hot reload).

## Deploy

The live site is https://myhours.alwaysdata.net (alwaysdata). After committing your changes:

```bash
.\deploy.cmd
```

(or `bash scripts/deploy.sh` from Git Bash). It refuses to run with uncommitted changes,
pushes `main` to GitHub, runs the tests, builds the frontend, uploads the code, runs the
migrations and checks that the live site serves the new build. The server's `.env` and
database are never overwritten. Use `--skip-tests` to skip the test run.

It needs the SSH key `~/.ssh/alwaysdata_myhours` (registered in the alwaysdata panel under
Remote access → SSH/SFTP → SSH keys).

## Pages

- **Track** – day view with a week strip; add, edit and delete time entries.
- **Detailed report** – period presets, filters by client / project / rate / tag / description,
  totals, breakdown by project and by rate, Excel export (all entries + total row, plus a
  summary sheet by project and by rate).
- **Rates** – hourly rates by type of work (e.g. Programming – 100 RON/h). Any rate can be
  used on any project; each time entry picks one.
- **Projects**, **Clients**, **Tags** – manage the lists used by the time entry form.
  A project can have a default rate that is pre-selected in the form.
  Tags can also be created directly from the time entry form.

## Notes

- The amount per hour is copied onto each time entry when it is saved, so changing a rate's
  amount does not rewrite past entries. When editing a rate you can choose to re-price the
  entries that use it.
- Entries that end before they start are treated as ending the next day (max. 24 hours).

## Tests

Tests run against a separate MySQL database, `myhours_test` (see `phpunit.xml`):

```bash
php artisan test
```

Local demo data (never on a real installation): `php artisan db:seed --class=DemoSeeder`.
