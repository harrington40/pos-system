#!/usr/bin/env ts-node
/**
 * OpenRx licence key tool — generate and inspect keys offline, deactivate them
 * through the API.
 *
 * It imports the same module the server uses (src/license/license-key.ts), so a
 * key minted here is exactly the key the server expects. Re-implementing the
 * format in a second place is what makes tooling and server drift apart.
 *
 *   npx ts-node scripts/license-key.ts generate --tier professional --months 12 --count 3
 *   npx ts-node scripts/license-key.ts inspect OPENRX-...
 *   npx ts-node scripts/license-key.ts revoke OPENRX-... --reason "refunded" --token <admin-jwt>
 *   npx ts-node scripts/license-key.ts unrevoke OPENRX-... --token <admin-jwt>
 *   npx ts-node scripts/license-key.ts list --token <admin-jwt>
 *
 * The signing secret is taken from --secret, then LICENSE_SECRET_CURRENT, then
 * backend/.env. A deployment only accepts keys signed with the same secret, so
 * the tool prints a fingerprint of the one it used — compare it with the
 * server's to be sure a key minted here will actually activate:
 *
 *   ssh dev@94.250.201.58 'cd /home/dev/openrx/backend && set -a && . ./.env &&
 *     set +a && node -e "console.log(require(\"crypto\").createHash(\"sha256\")
 *     .update(process.env.LICENSE_SECRET_CURRENT).digest(\"hex\").slice(0,8))"'
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
    LicenseTier,
    TIER_MAX_USERS,
    decodeKey,
    generateKey,
} from '../src/license/license-key';

const DEFAULT_API = 'https://openrx.transtechologies.com/api';
const TIERS: LicenseTier[] = ['basic', 'professional', 'enterprise'];

function fail(message: string): never {
    console.error(`error: ${message}`);
    process.exit(1);
}

function parseArgs(argv: string[]) {
    const args: Record<string, string> = {};
    const positional: string[] = [];
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (token.startsWith('--')) {
            const [name, inline] = token.slice(2).split('=');
            args[name] = inline !== undefined ? inline : (argv[++i] ?? '');
        } else {
            positional.push(token);
        }
    }
    return { args, positional };
}

function fingerprint(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex').slice(0, 8);
}

function resolveSecret(explicit?: string): { secret: string; source: string } {
    if (explicit) return { secret: explicit, source: '--secret' };
    if (process.env.LICENSE_SECRET_CURRENT) {
        return {
            secret: process.env.LICENSE_SECRET_CURRENT,
            source: 'LICENSE_SECRET_CURRENT',
        };
    }
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const found = fs
            .readFileSync(envPath, 'utf8')
            .match(/^LICENSE_SECRET_CURRENT=(.*)$/m);
        if (found && found[1].trim()) {
            return { secret: found[1].trim(), source: envPath };
        }
    }
    return fail(
        'no signing secret: pass --secret, export LICENSE_SECRET_CURRENT, or set it in backend/.env',
    );
}

function cmdGenerate(args: Record<string, string>, positional: string[]): void {
    const tier = (args.tier ?? positional[0] ?? '') as LicenseTier;
    if (!TIERS.includes(tier)) {
        fail(`--tier must be one of: ${TIERS.join(', ')}`);
    }
    const months = Number(args.months ?? 12);
    const count = Number(args.count ?? 1);
    if (!Number.isInteger(count) || count < 1) fail('--count must be 1 or more');

    const { secret, source } = resolveSecret(args.secret);
    console.log(`secret   : ${source} (fingerprint ${fingerprint(secret)})`);
    console.log(
        `tier     : ${tier} · ${months} months · ${TIER_MAX_USERS[tier]} seats`,
    );

    const keys: string[] = [];
    for (let i = 0; i < count; i++) {
        keys.push(generateKey(secret, tier, months));
    }
    console.log(args.json === 'true' ? JSON.stringify(keys) : keys.join('\n'));
}

function cmdInspect(args: Record<string, string>, positional: string[]): void {
    const key = positional[0];
    if (!key) fail('usage: inspect <key>');
    const { secret, source } = resolveSecret(args.secret);
    const decoded = decodeKey(key, [secret]);

    console.log(`key      : ${key}`);
    console.log(`secret   : ${source} (fingerprint ${fingerprint(secret)})`);
    if (!decoded) {
        console.log(
            'verdict  : NOT VALID under this secret — wrong secret, or a damaged key',
        );
        process.exitCode = 2;
        return;
    }
    console.log(
        `tier     : ${decoded.tier} (${TIER_MAX_USERS[decoded.tier]} seats)`,
    );
    console.log(`months   : ${decoded.durationMonths}`);
    console.log(`issued   : ${new Date(decoded.generatedAt).toISOString()}`);
    console.log(`canonical: ${decoded.canonicalKey}`);
    console.log(`hash     : ${decoded.keyHash}`);
    console.log('verdict  : valid (a deployment using this secret will accept it)');
}

async function apiCall(
    endpoint: string,
    method: 'GET' | 'POST',
    args: Record<string, string>,
    body?: unknown,
): Promise<unknown> {
    const token = args.token ?? process.env.OPENRX_API_TOKEN;
    if (!token) {
        fail('this command needs an admin token: pass --token <jwt> or export OPENRX_API_TOKEN');
    }
    const response = await fetch(`${args.url ?? DEFAULT_API}${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) fail(`${endpoint} -> HTTP ${response.status} ${text}`);
    return text ? JSON.parse(text) : {};
}

async function cmdRevoke(
    args: Record<string, string>,
    positional: string[],
    restore: boolean,
): Promise<void> {
    const key = positional[0];
    if (!key) fail(`usage: ${restore ? 'unrevoke' : 'revoke'} <key>`);
    const result = await apiCall(
        restore ? '/license/unrevoke' : '/license/revoke',
        'POST',
        args,
        restore ? { key } : { key, reason: args.reason },
    );
    console.log(JSON.stringify(result));
}

async function cmdList(args: Record<string, string>): Promise<void> {
    const result = (await apiCall('/license/revoked', 'GET', args)) as {
        revoked: unknown[];
    };
    console.log(JSON.stringify(result.revoked, null, 2));
}

function usage(): void {
    console.log(
        [
            'OpenRx licence key tool',
            '',
            '  generate  --tier <basic|professional|enterprise> [--months 12] [--count 1] [--secret S] [--json true]',
            '  inspect   <key> [--secret S]',
            '  revoke    <key> [--reason "text"] [--token JWT] [--url API]',
            '  unrevoke  <key> [--token JWT] [--url API]',
            '  list      [--token JWT] [--url API]',
            '',
            'The secret comes from --secret, then LICENSE_SECRET_CURRENT, then backend/.env.',
        ].join('\n'),
    );
}

async function main(): Promise<void> {
    const [command, ...rest] = process.argv.slice(2);
    const { args, positional } = parseArgs(rest);
    switch (command) {
        case 'generate':
            return cmdGenerate(args, positional);
        case 'inspect':
            return cmdInspect(args, positional);
        case 'revoke':
            return cmdRevoke(args, positional, false);
        case 'unrevoke':
            return cmdRevoke(args, positional, true);
        case 'list':
            return cmdList(args);
        default:
            usage();
            process.exitCode = command ? 1 : 0;
    }
}

void main();

