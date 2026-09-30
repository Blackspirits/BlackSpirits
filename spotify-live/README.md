# Spotify live card

The existing Render service `blackspirits-spotify-card` serves both the GitHub README card and the portfolio Now Playing JSON endpoint.

## Public routes

- `/card.svg` — dynamic 720 px SVG used by the GitHub profile.
- `/open` — redirects to the current/recent Spotify track when the official API is configured, otherwise to the Spotify profile.
- `/now-playing` — JSON used by `blackspirits.github.io`.
- `/healthz` — lightweight Render health response.
- `/health` — configuration status without exposing secrets.
- `/login` — temporary OAuth setup form; unavailable after `LOGIN_SECRET` is removed.
- `/callback` — Spotify OAuth callback.

## Permanent Render environment variables

Keep these five variables configured:

- `PUBLIC_ORIGIN=https://blackspirits.github.io`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI=https://blackspirits-spotify-card.onrender.com/callback`
- `SPOTIFY_REFRESH_TOKEN`

Do **not** keep `LOGIN_SECRET` enabled after authorization is complete.

## Spotify Web API authorization

The app uses Spotify's Authorization Code flow and only requests:

- `user-read-currently-playing`
- `user-read-recently-played`

To authorize or recover the integration:

1. Add a temporary random `LOGIN_SECRET` in Render and deploy.
2. Open `https://blackspirits-spotify-card.onrender.com/login`.
3. Enter the exact `LOGIN_SECRET` in the form.
4. Approve the Spotify authorization request.
5. Copy the refresh token shown by the callback page directly into Render as `SPOTIFY_REFRESH_TOKEN`.
6. Save and deploy.
7. Verify `/health` reports:
   - `"spotify_configured": true`
   - `"source": "spotify-web-api"`
8. Remove `LOGIN_SECRET` from Render and deploy again.

Never paste the client secret, login secret or refresh token into issues, pull requests, chat logs or source control.

## Runtime behaviour

With the official Spotify Web API configured:

- active playback renders as `Now playing`;
- a current item with `is_playing=false` renders as `Paused`;
- with no active playback, the most recent item renders as `Recently played`;
- the portfolio polls `/now-playing` every 30 seconds;
- the portfolio keeps the last successful state through short failures, then hides the optional Now Playing block after two minutes of consecutive failures.

The README card still keeps the previous kittinanx integration as a compatibility fallback if the official Spotify API becomes unavailable. The fallback is not the normal data source once `SPOTIFY_REFRESH_TOKEN` is configured.

## Troubleshooting

- **`/login` says LOGIN_SECRET is not configured** — add a temporary `LOGIN_SECRET` in Render and deploy.
- **Spotify authorization fails with `Invalid client secret`** — recopy the Client Secret from the same Spotify app as the configured Client ID.
- **Spotify authorization fails with `Invalid authorization code`** — restart the login flow; authorization codes are single-use and short-lived.
- **`/health` reports `legacy-fallback`** — one or more required Spotify variables are missing.
- **The portfolio Now Playing block disappears** — the backend has failed continuously for more than two minutes; the embedded playlist remains available.

## Security

- Secrets live only in Render environment variables.
- `LOGIN_SECRET` is submitted by POST and is not placed in the URL or browser history.
- OAuth state is HMAC-signed and expires after 10 minutes.
- Public health endpoints expose configuration state only, never secret values.
