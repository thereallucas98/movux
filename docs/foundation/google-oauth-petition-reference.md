# Reference: Google OAuth for Petitions (copa-bolao-web-app)

**Source:** `../../../copa-bolao-web-app/apps/web/src/lib/firebase/auth.ts`
**Applied to:** Movux petition feature (BUSINESS-FOUNDATION.md §9)

---

## Purpose

The petition feature (`/p/[slug]`) needs minimal-friction authentication to record a signature. Google OAuth is the right fit:
- LGPD-compliant: user consents explicitly via Google's own UI
- No password management
- Collects only `name` + `email` (minimal scope)
- Works on mobile (critical for drivers)

---

## Key learnings from copa-bolao

### 1. Popup vs Redirect

```ts
// DEV — popup (redirect fails on localhost)
const result = await signInWithPopup(auth, provider)

// PROD — always redirect (popup is blocked by Safari iOS, WebViews, extensions)
await signInWithRedirect(auth, provider)
```

**For Movux petitions:** always use redirect in production. Safari iOS blocks popups — and drivers use iPhones.

### 2. Redirect pending flag

Before navigating away to Google, set a flag so the petition page shows a loading state on return instead of flashing the "Sign with Google" button again:

```ts
sessionStorage.setItem('auth:redirect-pending', '1')
await signInWithRedirect(auth, provider)
```

On boot, call `getRedirectResult()` to capture the returning user.

### 3. `onAuthStateChanged` for reactive state

```ts
onAuthStateChanged(auth, (user) => {
  // user is null → unauthenticated
  // user is User → has uid, displayName, email, photoURL
})
```

---

## Movux adaptation (no Firebase dependency)

Movux uses PostgreSQL + JWT (no Firebase). For petitions, the OAuth flow should be:

```
User lands on /p/[slug]
  → clicks "Assinar com Google"
  → redirect to Google OAuth (NextAuth.js or custom Google OAuth route)
  → Google returns { name, email, sub (Google ID) }
  → POST /api/petitions/[slug]/sign { googleId, name, email }
    → upsert User (source: 'petition', role: 'GUEST')
    → upsert PetitionSignature
    → return { signed: true, userId }
  → redirect to /p/[slug]/obrigado?onboarding=true
  → onboarding invite with source='petition' context
```

**LGPD consent:** show a checkbox before the Google button — "Concordo em compartilhar nome e e-mail para assinar esta petição e receber convite para o Movux." Required field before OAuth starts.

---

## Implementation notes (for when this feature is built)

- Use **NextAuth.js** with Google provider — handles the redirect/callback cycle cleanly in Next.js App Router
- Scope: `openid email profile` (minimal)
- `prompt: 'select_account'` — force account chooser even if already signed in (copa-bolao pattern)
- Store `googleId` on User as nullable field — petition signers may never set a password
- `source` field on User distinguishes organic signups from petition conversions — critical for analytics and differentiated onboarding
- Petition page is fully public (no auth required to view) — only signing requires OAuth

---

## Files to reference when building

| File | Repo | What it shows |
|---|---|---|
| `apps/web/src/lib/firebase/auth.ts` | copa-bolao | popup vs redirect logic + redirect pending flag |
| `apps/web/src/hooks/use-auth.ts` | copa-bolao | `onAuthStateChanged` reactive pattern |
| `apps/web/src/pages/auth/login.tsx` | copa-bolao | Google sign-in button + loading state on redirect return |
