from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"Could not locate {label}")
    return text.replace(old, new, 1)


# 1) HTML form login must mint the app's JWT fallback cookie.
auth_path = Path("packages/core/src/routes/auth.ts")
auth = auth_path.read_text(encoding="utf-8")

marker = "    if (email === DEMO_EMAIL) {"
insert = """    // Synchronize browser form login with the application's JWT fallback.
    const browserUser = await c.env.DB.prepare(
      'SELECT id, email, role, is_active FROM auth_user WHERE lower(email) = ? LIMIT 1'
    ).bind(email).first() as { id: string; email: string; role?: string; is_active?: number } | null

    if (!browserUser || browserUser.is_active === 0) {
      return c.html(html`<div class=\"bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded\">This account is inactive or could not be found.</div>`)
    }

    const browserTokenTtl = await getJwtExpirySecondsFromDb(c.env.DB, c.env)
    const browserToken = await AuthManager.generateToken(
      browserUser.id,
      browserUser.email,
      browserUser.role ?? 'viewer',
      c.env.JWT_SECRET,
      browserTokenTtl
    )

    setCookie(c, 'auth_token', browserToken, {
      httpOnly: true,
      secure: new URL(c.req.url).protocol === 'https:',
      sameSite: 'Strict',
      path: '/',
      maxAge: browserTokenTtl,
    })

"""
auth = replace_once(auth, marker, insert + marker, "form-login insertion point")
auth_path.write_text(auth, encoding="utf-8")

# 2) JWT middleware re-checks that the user still exists and is active.
app_path = Path("packages/core/src/app.ts")
app = app_path.read_text(encoding="utf-8")
old = "          if (payload) c.set('user', { userId: payload.userId, email: payload.email, role: payload.role, exp: payload.exp, iat: payload.iat })"
new = """          if (payload) {
            const currentUser = await c.env.DB.prepare(
              'SELECT id, email, role, is_active FROM auth_user WHERE id = ? LIMIT 1'
            ).bind(payload.userId).first() as { id: string; email: string; role?: string; is_active?: number } | null
            if (currentUser && currentUser.is_active !== 0) {
              c.set('user', {
                userId: String(currentUser.id),
                email: String(currentUser.email ?? payload.email),
                role: String(currentUser.role ?? payload.role ?? 'viewer'),
                exp: payload.exp,
                iat: payload.iat,
              })
            }
          }"""
app = replace_once(app, old, new, "JWT middleware user assignment")
app_path.write_text(app, encoding="utf-8")

print("Auth loop repair patch prepared successfully.")
