# Draft: Auth Callback Hash Fix

## Problem
Magic link redirects to `/dashboard#access_token=...`, but `/dashboard` is behind a server-side auth gate. The gate redirects to `/sign-in` before AuthHashHandler can process the hash. The hash gets lost.

## Root Cause
The callback route currently redirects to `/dashboard` (behind auth gate) instead of `/` (no auth gate). AuthHashHandler is in root layout but can't run because the server redirect happens first.

## Fix
1. In `apps/web/src/app/auth/callback/route.ts`: Change the hash-based callback HTML to redirect to `/` (landing page) instead of `/dashboard`
2. AuthHashHandler (already in root layout, already processes hash and redirects to `/dashboard`) will catch it
3. Remove debug console.log statements from callback route

## Verification
1. Sign in with any email via curl
2. Extract magic link URL from Inbucket
3. Follow magic link with curl (follow redirects)
4. Verify final destination is `/dashboard` (not `/sign-in?error=auth`)

## Scope
- IN: callback route.ts fix, remove debug logs
- OUT: No other file changes
