// Postman Test script — paste into Refresh request → Scripts → Post-response tab
// Updates access_token + refresh_token after refresh

const r = pm.response.json();

if (pm.response.code === 200 || pm.response.code === 201) {
    if (r.accessToken) {
        pm.collectionVariables.set('access_token', r.accessToken);
        pm.environment.set('access_token', r.accessToken);
        console.log('✓ access_token rotated');
    }
    const setCookie = pm.response.headers.get('Set-Cookie');
    if (setCookie) {
        const m = /refresh_token=([^;]+)/.exec(setCookie);
        if (m) {
            const raw = decodeURIComponent(m[1]);
            pm.collectionVariables.set('refresh_token', raw);
            pm.environment.set('refresh_token', raw);
            console.log('✓ refresh_token rotated');
        }
    }
    pm.test('Refresh ok', () => pm.response.to.be.success);
} else {
    pm.test('Refresh failed', () => pm.expect.fail(r.message ?? 'unknown'));
}
