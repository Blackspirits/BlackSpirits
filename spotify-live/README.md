# Spotify live card

The existing Render service `blackspirits-spotify-card` serves both the GitHub README card and the portfolio Now Playing JSON endpoint.

## Public routes

- `/card.svg` — dynamic 720px SVG used by the GitHub profile.
- `/open` — redirects to the current/recent Spotify track when the official API is configured, otherwise to the Spotify profile.
- `/now-playing` — JSON used by `blackspirits.github.io`.
- `/healthz` — lightweight Render health response.
- `/health` — configuration status without exposing secrets.

## Spotify Web API setup

Required Render environment variables:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REFRESH_TOKEN` — added after the one-time OAuth flow.
- `LOGIN_SECRET` — protects the one-time `/login` route.
- `SPOTIFY_REDIRECT_URI=https://blackspirits-spotify-card.onrender.com/callback`
- `PUBLIC_ORIGIN=https://blackspirits.github.io`

Scopes are deliberately limited to:

- `user-read-currently-playing`
- `user-read-recently-played`

The Authorization Code flow is used so access tokens can be refreshed server-side.

Until the Spotify environment variables are configured, `/card.svg` keeps using the previous kittinanx source as a compatibility fallback. The portfolio's Now Playing block stays hidden, while its embedded playlist remains available.

Never commit Spotify credentials or refresh tokens to GitHub.
