/**
 * Supported EVM chains — Ethereum, Robinhood Chain, and Ink Chain.
 *
 * Add new chains here; all other modules resolve chain metadata from this file.
 */

// ─── Chain IDs ────────────────────────────────────────────────────────────────
export const ETH_MAINNET_CHAIN_ID = 1;

/**
 * Robinhood Chain — configure via ROBINHOOD_CHAIN_ID env var.
 * Set the correct chain ID once Robinhood's mainnet is publicly registered.
 */
export const ROBINHOOD_CHAIN_ID =
    parseInt(process.env.ROBINHOOD_CHAIN_ID || '0', 10) || 2000; // override via env

/**
 * Ink Chain — Kraken's OP-Stack L2.
 * Mainnet chain ID: 57073.  Override via INK_CHAIN_ID env var if needed.
 */
export const INK_CHAIN_ID =
    parseInt(process.env.INK_CHAIN_ID || '0', 10) || 57073;

// ─── Chain metadata ────────────────────────────────────────────────────────────
export interface ChainInfo {
    id: number;
    name: string;
    slug: string;
    /** Shortened human-readable label, e.g. for Telegram messages. */
    label: string;
    /** Whether the chain supports EIP-1559 fee market. */
    eip1559: boolean;
    /** Block explorer base URL (no trailing slash). */
    explorer: string;
    /** Whether Flashbots / MEV-blocker bundle submission is supported. */
    bundlesSupported: boolean;
    /** Native currency symbol. */
    nativeCurrency: string;
}

export const SUPPORTED_CHAINS: Readonly<Record<number, ChainInfo>> = {
    [ETH_MAINNET_CHAIN_ID]: {
        id: ETH_MAINNET_CHAIN_ID,
        name: 'Ethereum Mainnet',
        slug: 'ethereum',
        label: 'ETH',
        eip1559: true,
        explorer: 'https://etherscan.io',
        bundlesSupported: true,
        nativeCurrency: 'ETH',
    },
    [ROBINHOOD_CHAIN_ID]: {
        id: ROBINHOOD_CHAIN_ID,
        name: 'Robinhood Chain',
        slug: 'robinhood',
        label: 'RHN',
        eip1559: true,
        explorer: 'https://explorer.robinhood.com',  // update when live
        bundlesSupported: false,
        nativeCurrency: 'ETH',
    },
    [INK_CHAIN_ID]: {
        id: INK_CHAIN_ID,
        name: 'Ink',
        slug: 'ink',
        label: 'INK',
        eip1559: true,
        explorer: 'https://explorer.inkonchain.com',
        bundlesSupported: false,
        nativeCurrency: 'ETH',
    },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** All registered chain IDs. */
export function getSupportedChainIds(): number[] {
    return Object.keys(SUPPORTED_CHAINS).map(Number);
}

/** Chain metadata by ID, or undefined if not registered. */
export function getChainById(chainId: number): ChainInfo | undefined {
    return SUPPORTED_CHAINS[chainId];
}

/** Human-readable chain name, e.g. "Ink" or "Ethereum Mainnet". */
export function getChainName(chainId: number): string {
    return SUPPORTED_CHAINS[chainId]?.name ?? `Chain ${chainId}`;
}

/** Short slug ("ethereum" | "robinhood" | "ink") for display / API calls. */
export function getChainSlug(chainId: number): string {
    return SUPPORTED_CHAINS[chainId]?.slug ?? String(chainId);
}

/** Block explorer tx URL, e.g. for Telegram notifications. */
export function getTxExplorerUrl(chainId: number, txHash: string): string {
    const base = SUPPORTED_CHAINS[chainId]?.explorer ?? 'https://etherscan.io';
    return `${base}/tx/${txHash}`;
}

/** Block explorer address URL. */
export function getAddressExplorerUrl(chainId: number, address: string): string {
    const base = SUPPORTED_CHAINS[chainId]?.explorer ?? 'https://etherscan.io';
    return `${base}/address/${address}`;
}

// ─── Slug / ID resolution ─────────────────────────────────────────────────────

/** Resolve a slug ("ethereum", "eth", "robinhood", "ink", …) to its chain ID. */
export function chainSlugToId(slug: string): number | undefined {
    const s = slug.toLowerCase().trim();
    // shorthand aliases
    if (s === 'eth' || s === 'mainnet' || s === 'homestead') return ETH_MAINNET_CHAIN_ID;
    if (s === 'rhn' || s === 'robinhood') return ROBINHOOD_CHAIN_ID;
    if (s === 'ink') return INK_CHAIN_ID;
    // match registered slugs
    const found = Object.values(SUPPORTED_CHAINS).find(c => c.slug === s);
    return found?.id;
}

/** True when `chainId` is Ethereum mainnet (kept for backwards-compat). */
export function isEthereumChainId(chainId: number): boolean {
    return chainId === ETH_MAINNET_CHAIN_ID;
}

/** True when `slug` resolves to Ethereum mainnet. */
export function isEthereumChainSlug(slug: string): boolean {
    const s = slug.toLowerCase();
    return s === 'ethereum' || s === 'eth' || s === 'mainnet' || s === 'homestead';
}

/** True when `chainId` is Robinhood Chain. */
export function isRobinhoodChainId(chainId: number): boolean {
    return chainId === ROBINHOOD_CHAIN_ID;
}

/** True when `chainId` is Ink Chain. */
export function isInkChainId(chainId: number): boolean {
    return chainId === INK_CHAIN_ID;
}

/** True when `chainId` is any registered chain. */
export function isSupportedChainId(chainId: number): boolean {
    return chainId in SUPPORTED_CHAINS;
}

/** True when the chain supports Flashbots bundle submission. */
export function chainSupportsBundles(chainId: number): boolean {
    return SUPPORTED_CHAINS[chainId]?.bundlesSupported ?? false;
}
