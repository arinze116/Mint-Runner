import type { MintCandidate, MintIntent } from '../types/mintIntent';
import type { DetectedMintCandidate } from '../types/copyMint';
import type { DetectedMint } from '../utils/trackerCore';
import {
    classifyMintCandidate,
    mintCandidateFromDetectedMint,
    type MintIntentClassifyCtx,
} from './mintIntentClassifier';
import { DetectionEngine } from '../engine/DetectionEngine';
import { CopyMintEngine } from '../engine/CopyMintEngine';
import type { CopyMintExecuteInput } from '../types/copyMint';
import { trackerDebugState } from './trackerDebugState';
import { getContractMintConfig } from '../contractMint/config.js';

let lastCandidate: MintCandidate | undefined;
let lastIntent: MintIntent | undefined;
let lastSkipReason: string | undefined;

export function getOrchestratorDebug() {
    return {
        lastCandidate,
        lastIntent,
        lastSkipReason,
        tracker: trackerDebugState.get(),
    };
}

export { mintCandidateFromDetectedMint };

export function intentToEngineCandidate(intent: MintIntent): DetectedMintCandidate {
    return {
        detectionId: `intent-${intent.sourceTxHash.slice(0, 12)}-${Date.now()}`,
        sourceTxHash: intent.sourceTxHash,
        sourceWallet: intent.sourceFrom,
        target: intent.targetContract,
        to: intent.executionTo,
        data: intent.calldata,
        value: intent.totalValueWei,
        detectedAtMs: intent.detectedAt,
        detectionSource: 'pending',
        warnings: intent.canAutoExecute ? [] : [intent.reason],
    };
}

/**
 * Classify a mint candidate and optionally execute via CopyMintEngine.
 */
export async function processCandidate(
    candidate: MintCandidate,
    ctx: MintIntentClassifyCtx,
    executeInput?: Omit<CopyMintExecuteInput, 'candidate'>
): Promise<{ intent: MintIntent; executed: boolean; skipReason?: string }> {
    lastCandidate = candidate;
    trackerDebugState.setLastCandidate(candidate);

    const mintLike: DetectedMint = {
        hash: candidate.sourceTxHash,
        from: candidate.sourceFrom,
        to: candidate.txTo,
        value: candidate.txValueWei,
        data: candidate.txData,
        timestamp: candidate.receivedAt,
        classificationConfidence: candidate.classificationConfidence ?? 'low',
        detectionPath: candidate.detectionSource === 'pending' ? 'pending' : 'confirmed',
    };

    // Classify the intent
    const intent = await classifyMintCandidate(candidate, ctx);
    lastIntent = intent;

    if (!intent.canAutoExecute) {
        lastSkipReason = intent.reason;
        trackerDebugState.setLastSkipReason(intent.reason);
        return { intent, executed: false, skipReason: intent.reason };
    }

    if (!executeInput?.privateKeys?.length) {
        lastSkipReason = 'no_wallets';
        return { intent, executed: false, skipReason: 'no_wallets' };
    }

    const adapted = DetectionEngine.candidateFromTracker(mintLike);
    adapted.to = intent.executionTo;
    adapted.value = intent.totalValueWei;
    adapted.data = intent.calldata;

    await CopyMintEngine.execute({
        ...executeInput,
        triggerType: executeInput.triggerType ?? 'automint',
        candidate: adapted,
        paymentPlanValue: intent.totalValueWei,
    });

    lastSkipReason = CopyMintEngine.getLastSkipReason();
    const executed = !lastSkipReason || lastSkipReason === 'submitted';
    return { intent, executed, skipReason: lastSkipReason };
}

export async function classifyOnly(
    candidate: MintCandidate,
    ctx: MintIntentClassifyCtx
): Promise<MintIntent> {
    const intent = await classifyMintCandidate(candidate, ctx);
    lastCandidate = candidate;
    lastIntent = intent;
    return intent;
}

export function resetOrchestratorDebug(): void {
    lastCandidate = undefined;
    lastIntent = undefined;
    lastSkipReason = undefined;
}
