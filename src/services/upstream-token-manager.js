const env = require('../config/env');

let currentToken = null;
let tokenLoadedAtMs = 0;

function sanitizeSnippet(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);
}

async function requestUpstreamToken() {
    const requestTokenUrl = new URL('/readings/request-token', env.upstreamBaseUrl);

    requestTokenUrl.searchParams.set('username', env.apiUsername);
    requestTokenUrl.searchParams.set('password', env.apiPassword);
    console.log(requestTokenUrl.toString());
    const response = await fetch(requestTokenUrl, {
        method: 'GET',
        headers: {
            Accept: 'application/json, text/plain, */*',
            'User-Agent': 'irvine-obm-api/1.0 (+startup-token-fetch)'
        }
    });

    if (!response.ok) {
        const bodyText = await response.text();
        const snippet = sanitizeSnippet(bodyText);
        const error = new Error(
            `Failed to request upstream token (${response.status}). Response snippet: ${snippet}. ` +
            'Likely causes: API credentials invalid for this endpoint, source IP not allowed/whitelisted, or upstream WAF restriction.'
        );
        error.statusCode = 502;
        throw error;
    }

    const payload = await response.json();
    const token = payload['access-token'];

    if (!token) {
        const error = new Error('Upstream token response did not include access-token');
        error.statusCode = 502;
        throw error;
    }

    currentToken = token;
    tokenLoadedAtMs = Date.now();

    console.log('[token] Upstream token refreshed successfully');
    return currentToken;
}

async function initializeTokenManager() {
    console.log('[token] Requesting upstream token during startup');
    await requestUpstreamToken();
}

function getCurrentToken() {
    if (!currentToken) {
        const error = new Error('Upstream token is not available yet');
        error.statusCode = 503;
        throw error;
    }

    return currentToken;
}

function getTokenLoadedAt() {
    if (!tokenLoadedAtMs) {
        return null;
    }

    return new Date(tokenLoadedAtMs).toISOString();
}

module.exports = {
    initializeTokenManager,
    requestUpstreamToken,
    getCurrentToken,
    getTokenLoadedAt
};
