# AKWC MediaServe – correction notes

This package contains a first correction pass based on static source inspection.

## Changes made
- Fixed the React Rules of Hooks issue in `src/components/portals/AdminPortal.tsx` by ensuring all `useState` hooks run before the access-denied early return.
- Fixed the async member-creation flow by awaiting `addMember` before using the returned member ID.
- Added a clear runtime configuration error when Supabase environment variables are missing.
- Removed the hard-coded sample password from the initial account data and set that sample account to require activation.
- Replaced an invalid empty-array availability fallback with the declared `Flexible` union value.

## Important items still requiring backend work
- Password verification, first-time activation, password changes, and password resets currently need migration to Supabase Auth. A front-end-only change cannot safely replace authentication without configuring the Supabase Auth users, database schema, and recovery flow.
- Admin/leadership permissions must be enforced with Supabase Row Level Security policies, not only React checks.
- Several data mutations and reminder actions still need comprehensive error handling and a real reminder-dispatch integration.
- The automatic roster filler still needs explicit availability/blackout-date scheduling rules.

## Verification status
A production build and TypeScript check have **not** been verified in this environment because project dependencies were not available in the local package cache. Please install dependencies in your build environment and run `npm run lint` and `npm run build` before deploying.

## Additional correction: deleted default programs returning

- Updated `src/context/AppContext.tsx` so an empty `programs` table is treated as a valid empty list.
- The app no longer automatically inserts `INITIAL_PROGRAMS` when the database contains zero programs. This prevents deleted programs from reappearing after refresh or Supabase realtime reloads.
- Default sample programs will not automatically populate a genuinely empty database; create the required programs through the app, or use an explicitly implemented reset action if defaults are desired.
