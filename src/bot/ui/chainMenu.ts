/**
 * Chain switcher menu — lets any authorised user switch the active chain
 * from inside the Telegram bot without restarting.
 */
import { Markup } from 'telegraf';
import {
    SUPPORTED_CHAINS,
    getChainById,
    type ChainInfo,
} from '../../config/chains.js';
import { resolveChainHttpUrls } from '../../config/rpcEndpoints.js';

/** Build the chain-switcher inline keyboard. */
export function buildChainKeyboard(activeChainId: number) {
    const rows = Object.values(SUPPORTED_CHAINS).map((chain: ChainInfo) => {
        const isActive = chain.id === activeChainId;
        const label = isActive ? `• ${chain.name} (active)` : chain.name;
        return [Markup.button.callback(label, `chain_switch_${chain.id}`)];
    });
    rows.push([Markup.button.callback('« Home', 'menu_main')]);
    return Markup.inlineKeyboard(rows);
}

/** Build the chain-switcher message text. */
export function buildChainMenuText(activeChainId: number): string {
    const active = getChainById(activeChainId);

    const lines = Object.values(SUPPORTED_CHAINS).map((chain: ChainInfo) => {
        const isActive = chain.id === activeChainId;
        const rpcUrls  = resolveChainHttpUrls(chain.id);
        const rpcHost  = rpcUrls[0]
            ? (() => { try { return new URL(rpcUrls[0]).hostname; } catch { return rpcUrls[0].slice(0, 30); } })()
            : 'not configured';

        const marker = isActive ? '▶ ' : '  ';
        return (
            `${marker}<b>${chain.name}</b>${isActive ? ' (active)' : ''}\n` +
            `  ID: <code>${chain.id}</code>  |  ${chain.nativeCurrency}\n` +
            `  RPC: <code>${rpcHost}</code>`
        );
    });

    return (
        `<b>Chain Switcher</b>\n\n` +
        `Active: <b>${active?.name ?? `Chain ${activeChainId}`}</b>\n\n` +
        lines.join('\n\n') +
        `\n\n<i>Tap a chain to switch. Takes effect immediately for all new mints.</i>`
    );
}
