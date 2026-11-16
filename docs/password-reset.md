# Password reset by email

Built 16 November 2026. No database change. Code: `lib/password-reset.ts` (rules and wording in English and Kiswahili), `lib/auth-client.ts` (`requestPasswordReset`, `resetPassword`), `components/auth/AuthModal.tsx` (the "Forgot your password?" step), `components/auth/ResetPasswordScreen.tsx` and `app/reset-password/page.tsx` (the page the emailed link opens). Tests: `tests/password-reset.test.ts`.

## How a farmer uses it

1. On Sign in, tap **Forgot your password?**, enter their email, tap **Send reset link**.
2. The screen always says "If an account exists for that address, a link is on its way", whether or not the address has an account, so it cannot be used to find out who is registered. It also offers a WhatsApp message to Mylkio support.
3. Neon Auth emails a link. It works **once** and for **15 minutes**.
4. The link opens `/reset-password`. The farmer types a new password (12 or more characters, twice, with a Show button) and saves it. They are then told to sign in.
5. A used or expired link shows a plain explanation with a button to ask for a new one.

The page reads the token from the address once, then removes it from the address bar (so it is not left in browser history or passed on to other sites). It is kept out of search results (`noindex`, listed in `robots.txt`). English or Kiswahili follows the language the farmer chose in the app, and can be switched on the page.

## Checked against the live auth service (made-up address, no email sent)

- A request for an unknown address returns the same "if this email exists" answer as a known one.
- A reset link that points back to any site other than Mylkio is refused (`INVALID_REDIRECT_URL`).
- A wrong token is refused (`INVALID_TOKEN`), which the page shows as "expired or already used".

Not tested: an actual email arriving and the link being opened from it. That needs a real inbox; try it once with your own test account after release.

## Settings in Neon Auth that matter (the Neon console, not this code)

- **The sender is Neon's shared one** (`auth@mail.myneon.app`). Neon says it is for development and testing: it is rate-limited and emails from it may land in spam. For a launch with real farmers, connect Mylkio's own email sender (Settings, Better Auth, Custom SMTP; it needs an SMTP login and a sender address such as `no-reply@` your domain). The reset still works on the shared sender, just less reliably.
- **Application name** is the name shown in the email. It defaults to the Neon project name ("Mylkio-dairy-ms"); set it to "Mylkio".
- **Revoke sessions on password reset** is off by default. Turn it on so a reset signs the account out everywhere (important if a phone was lost).

## If a reset email never arrives

Farmers can still message support (the screen offers a WhatsApp button). An administrator cannot set a farmer's password from this app. In the Neon console an administrator can send or reset from the Auth users list.
