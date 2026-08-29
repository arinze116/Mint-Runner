/**
 * Mint execution facade — production path uses CopyMintEngine.
 */

import type { JsonRpcProvider } from 'ethers';
import { CopyMintEngine } from '../engine/CopyMintEngine';
import { DetectionEngine } from '../engine/DetectionEngine';
import type { CopyMintEngineOptions } from '../types/copyMint';

const TX_WAIT_TIMEOUT_MS = parseInt(process.env.TX_WAIT_TIMEOUT_MS || '60000', 10);

/** Wrap tx.wait with a timeout so it never hangs */
export async function waitWithTimeout(tx: any, confirmations = 1): Promise<any> {
    const waitPromise = tx.wait(confirmations);
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
            () => reject(new Error(`tx.wait timed out after ${TX_WAIT_TIMEOUT_MS}ms (tx may still confirm)`)),
            TX_WAIT_TIMEOUT_MS
        )
    );
    return Promise.race([waitPromise, timeoutPromise]);
}

/** Poll getTransactionReceipt until confirmed or timeout. */
export async function waitForTxReceipt(
    provider: { getTransactionReceipt: (hash: string) => Promise<{ status?: number | null; blockNumber?: number | null } | null> },
    txHash: string,
    confirmations = 1
): Promise<{ status: number; blockNumber: number }> {
    const deadline = Date.now() + TX_WAIT_TIMEOUT_MS;
    const pollMs = 2500;
    let last: { status?: number | null; blockNumber?: number | null } | null = null;

    while (Date.now() < deadline) {
        try { last = await provider.getTransactionReceipt(txHash); } catch { /* retry */ }
        if (last?.blockNumber != null) {
            return { status: last.status === 1 ? 1 : 0, blockNumber: Number(last.blockNumber) };
        }
        await new Promise(r => setTimeout(r, pollMs));
    }
    if (last?.blockNumber != null) {
        return { status: last.status === 1 ? 1 : 0, blockNumber: Number(last.blockNumber) };
    }
    throw new Error(`tx.wait timed out after ${TX_WAIT_TIMEOUT_MS}ms (tx may still confirm)`);
}

/** Estimate total ETH required: value + estimated gas cost. */
export async function estimateMintRequiredWei(
    provider: JsonRpcProvider,
    to: string,
    data: string,
    value: bigint,
    from: string
): Promise<bigint> {
    try {
        const [feeData, gasEstimate] = await Promise.all([
            provider.getFeeData(),
            provider.estimateGas({ to, data, value, from }),
        ]);
        const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
        return value + gasEstimate * gasPrice;
    } catch {
        return value;
    }
}

export type BatchCopyTradeOptions = CopyMintEngineOptions & {
    throttleSimulations?: boolean;
};

/**
 * @deprecated Use CopyMintEngine.execute directly.
 */
export const batchCopyTrade = async (
    wallets: string[],
    to: string,
    data: string,
    value: string,
    provider: JsonRpcProvider,
    options?: BatchCopyTradeOptions,
    whaleAddress?: string
) => {
    const candidate = DetectionEngine.candidateFromManual({
        to,
        data,
        value,
        sourceWallet: whaleAddress,
    });

    const result = await CopyMintEngine.execute({
        triggerType: options?.uid ? 'automint' : 'manual',
        provider,
        privateKeys: wallets,
        candidate,
        paymentPlanValue: value,
        options: {
            ...options,
            whaleAddress,
            throttleSimulations: options?.throttleSimulations,
            forceGasEstimate: options?.forceGasEstimate,
        },
    });

    return result.legacyResults;
};

export const copyTrade = async (
    walletPrivateKey: string,
    to: string,
    data: string,
    value: string,
    provider: JsonRpcProvider,
    _feeData?: unknown,
    options?: BatchCopyTradeOptions
) => {
    const results = await batchCopyTrade([walletPrivateKey], to, data, value, provider, options);
    if (results[0]?.status === 'fulfilled') return (results[0] as any).value;
    throw (results[0] as any)?.reason || new Error('copyTrade failed');
};
