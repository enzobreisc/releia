# Quick log on your phone

The quick log page (`/quick-log`) can be served from the Mac and installed on a phone as a home-screen app. It reads and writes the same SQLite file and the same `storage` folder (covers, photos) as the packaged desktop app, so sessions logged on either side show up on both.

## Setup

1. Install [Tailscale](https://tailscale.com/download) on the Mac and the phone and sign in to the same account.
2. Build the front-end assets once (and again after front-end changes): `npm run build`.
3. Copy `docs/com.releia.quicklog.plist` to `~/Library/LaunchAgents/`, replace `TAILSCALE_IP` with the output of `tailscale ip -4` and `PROJECT_PATH`, `PHP_PATH` and `HOME_PATH` with your paths, then run `launchctl load ~/Library/LaunchAgents/com.releia.quicklog.plist`.
4. On the phone open `http://TAILSCALE_IP:8000/quick-log` and choose "Add to Home Screen".

The server binds to the Tailscale address only, because the app has no login: nothing outside your tailnet can reach it.

## Lock screen widget

[`docs/scriptable/reading-timer.js`](scriptable/reading-timer.js) is a [Scriptable](https://scriptable.app) widget for the lock screen. While a session runs it shows the book and a live counter; when nothing is running it shows the book you last read, the last seven days and the streak. It reads `GET /quick-log/timer`.

1. Install Scriptable on the phone, create a script named `releia`, paste the file and replace `TAILSCALE_IP`.
2. Add a rectangular Scriptable widget to the lock screen and pick the script.

The counter ticks on its own, but iOS decides when the widget fetches the timer again, so starting, pausing or ending a session can take a few minutes to show. Running the script inside Scriptable refreshes it at once; the "atualizar widget" link at the top of the phone quick log does that through the `scriptable:///run/releia` URL.

After adding migrations, run `php artisan migrate` against the shared database (`DB_DATABASE="$HOME/Library/Application Support/releia/database/database.sqlite" php artisan migrate`).
