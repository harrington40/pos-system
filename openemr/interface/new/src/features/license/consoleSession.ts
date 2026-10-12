/**
 * The marketing console's own credential, held in memory only.
 *
 * Deliberately not persisted. A reload demands the administrator password again,
 * and anything left in localStorage is readable by every script on the page. The
 * application's normal session is untouched: the console authenticates
 * separately, so unlocking it can never be inherited from whoever happens to be
 * signed in.
 */
let adminToken: string | null = null;
let adminUsername = '';

export function setConsoleSession(token: string, username: string): void {
    adminToken = token;
    adminUsername = username;
}

export function clearConsoleSession(): void {
    adminToken = null;
    adminUsername = '';
}

export function getConsoleToken(): string | null {
    return adminToken;
}

export function getConsoleUsername(): string {
    return adminUsername;
}

export function hasConsoleSession(): boolean {
    return !!adminToken;
}
