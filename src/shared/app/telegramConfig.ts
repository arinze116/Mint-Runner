/**
 * Telegram token resolution.
 *
 * Token priority (first non-empty wins):
 *   MINT_BOT_TOKEN → BOT_TOKEN
 *
 * So you only need to set BOT_TOKEN in your .env — no separate MINT_BOT_TOKEN required.
 */
import type { BotRole } from './role.js';

function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
    for (const v of values) {
        const t = v?.trim();
        if (t) return t;
    }
    return undefined;
}

export function resolveTelegramToken(_role: BotRole): string {
    const token = firstNonEmpty(
        process.env.MINT_BOT_TOKEN,
        process.env.BOT_TOKEN,
    );
    if (!token) {
        throw new Error(
            '[mint-runner] No Telegram token found.\n' +
            'Set BOT_TOKEN=<your token> in your .env file.\n' +
            '  (MINT_BOT_TOKEN is also accepted if you prefer the explicit name)'
        );
    }
    return token;
}

export function resolveServicePort(_role: BotRole, fallback: number): number {
    const raw = process.env.MINT_BOT_PORT || process.env.PORT;
    const n = parseInt(raw || String(fallback), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}
