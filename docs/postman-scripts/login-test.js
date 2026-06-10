// Postman Test script — paste into Login request → Scripts → Post-response tab
// Auto-stores: access_token, refresh_token, user_id, user_role, user_email
// Also extracts refresh_token from Set-Cookie header (httpOnly)

const r = pm.response.json();

if (pm.response.code === 201 || pm.response.code === 200) {
    // ---- access token from body ----
    if (r.accessToken) {
        pm.collectionVariables.set('access_token', r.accessToken);
        pm.environment.set('access_token', r.accessToken);
        console.log('✓ access_token saved');
    }

    // ---- user fields ----
    if (r.user) {
        pm.collectionVariables.set('user_id', r.user.id);
        pm.collectionVariables.set('user_email', r.user.email);
        pm.collectionVariables.set('user_role', r.user.role);
        pm.environment.set('user_id', r.user.id);
        pm.environment.set('user_email', r.user.email);
        pm.environment.set('user_role', r.user.role);
        if (Array.isArray(r.user.permissions)) {
            pm.collectionVariables.set('user_perms', r.user.permissions.join(','));
        }
        console.log(`✓ user: ${r.user.email} (${r.user.role})`);
    }

    // ---- refresh_token from Set-Cookie header ----
    const setCookie = pm.response.headers.get('Set-Cookie');
    if (setCookie) {
        const m = /refresh_token=([^;]+)/.exec(setCookie);
        if (m) {
            const raw = decodeURIComponent(m[1]);
            pm.collectionVariables.set('refresh_token', raw);
            pm.environment.set('refresh_token', raw);
            console.log(`✓ refresh_token saved (${raw.slice(0, 20)}...)`);
        } else {
            console.log('⚠ Set-Cookie present but refresh_token not found in:', setCookie);
        }
    } else {
        console.log('⚠ No Set-Cookie header — refresh cookie not extractable');
    }

    // ---- assertions ----
    pm.test('Login returns 2xx', () => pm.response.to.be.success);
    pm.test('Response has accessToken', () => pm.expect(r.accessToken).to.be.a('string'));
    pm.test('Response has user object', () => pm.expect(r.user).to.be.an('object'));
} else {
    pm.test(`Login failed with ${pm.response.code}`, () => pm.expect.fail(r.message ?? 'unknown'));
    console.log('✗ Login failed:', JSON.stringify(r));
}
