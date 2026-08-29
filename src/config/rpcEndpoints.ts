/**
 * Central RPC / WebSocket URL resolution for tracker vs execution budgets.
 *
 * Chain-specific overrides follow this priority order:
 *   1. Chain-specific env var  (e.g. INK_RPC_URL, ROBINHOOD_RPC_URL)
 *   2. Generic TRACKER_RPC_URL / EXECUTION_RPC_URL
 *   3. PROVIDER_URL fallback
 */

import {
    ETH_MAINNET_CHAIN_ID,
    ROBINHOOD_CHAIN_ID,
    INK_CHAIN_ID,
} from './chains.js';

export function splitRpcUrls(raw?: string): string[] {
    if (!raw?.trim()) return [];
    return raw.split(',').map(s => s.trim()).filter(Boolean);
}

// ─── Per-chain RPC env-var names ──────────────────────────────────────────────

/** Returns the env-var prefix for a given chain ID, or null for Ethereum (uses generic vars). */
function chainEnvPrefix(chainId: number): string | null {
    if (chainId === ROBINHOOD_CHAIN_ID) return 'ROBINHOOD';
    if (chainId === INK_CHAIN_ID) return 'INK';
    return null; // Ethereum uses generic PROVIDER_URL / EXECUTION_RPC_URL etc.
}

/**
 * HTTP RPC URLs for a specific chain.
 * Falls back to the generic PROVIDER_URL when no chain-specific var is set.
 */
export function resolveChainHttpUrls(chainId: number): string[] {
    const prefix = chainEnvPrefix(chainId);
    if (prefix) {
        const specific = splitRpcUrls(process.env[`${prefix}_RPC_URL`]);
        if (specific.length) return specific;
    }
    // Ethereum or unset chain-specific var → generic pool
    return resolveTrackerHttpUrls();
}

/**
 * Execution RPC URLs for a specific chain.
 * Falls back to resolveExecutionUrls() when no chain-specific var is set.
 */
export function resolveChainExecutionUrls(chainId: number): string[] {
    const prefix = chainEnvPrefix(chainId);
    if (prefix) {
        const specific = splitRpcUrls(process.env[`${prefix}_EXECUTION_RPC_URL`]
            || process.env[`${prefix}_RPC_URL`]);
        if (specific.length) return specific;
    }
    return resolveExecutionUrls();
}

// ─── Generic resolvers (Ethereum / fallback) ──────────────────────────────────

/** Tracker block polling + reads — TRACKER_RPC_URL, else PROVIDER_URL. */
export function resolveTrackerHttpUrls(): string[] {
    const fromTracker = splitRpcUrls(process.env.TRACKER_RPC_URL);
    if (fromTracker.length) return fromTracker;
    return splitRpcUrls(process.env.PROVIDER_URL);
}

/** Pending mempool path — TRACKER_WS_RPC_URL, else WS_RPC_URL. */
export function resolveTrackerWsUrl(): string | undefined {
    const tracker = process.env.TRACKER_WS_RPC_URL?.trim();
    if (tracker) return tracker;
    return process.env.WS_RPC_URL?.trim() || undefined;
}

/** Mint execution broadcasts — EXECUTION_RPC_URL + BACKUP_RPC_URLS, else PROVIDER_URL. */
export function resolveExecutionUrls(): string[] {
    const primary = splitRpcUrls(process.env.EXECUTION_RPC_URL);
    const backups = splitRpcUrls(process.env.BACKUP_RPC_URLS);
    const combined = [...primary, ...backups];
    if (combined.length) return combined;
    return splitRpcUrls(process.env.PROVIDER_URL);
}

export function toHttpRpcUrl(url: string): string {
    return url.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
}

export function getTrackerHttpUrl(): string | null {
    const raw = resolveTrackerHttpUrls()[0]?.trim();
    if (!raw) return null;
    return toHttpRpcUrl(raw);
}

/**
 * Return the first available HTTP RPC URL for any registered chain.
 * Used by the /chain command to display per-chain RPC status.
 */
export function getChainRpcSummary(): Record<string, string> {
    const chains: Array<{ id: number; slug: string }> = [
        { id: ETH_MAINNET_CHAIN_ID, slug: 'ethereum' },
        { id: ROBINHOOD_CHAIN_ID, slug: 'robinhood' },
        { id: INK_CHAIN_ID, slug: 'ink' },
    ];
    const out: Record<string, string> = {};
    for (const { id, slug } of chains) {
        const urls = resolveChainHttpUrls(id);
        out[slug] = urls[0] ?? '<not configured>';
    }
    return out;
}
