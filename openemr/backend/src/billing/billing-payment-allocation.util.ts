/**
 * Pure helpers for the "partial payment" billing workflow.
 *
 * Two things are decided here, in isolation from the database, so they can be
 * reasoned about and regression-tested the way the rest of the money code is
 * (see `billing-integrity.util.spec.ts`):
 *
 *   1. How a payment is spread across a patient's outstanding lab / pharmacy
 *      holds, and what each hold still owes afterwards.
 *   2. Which holds that allocation is enough to release (the block is lifted)
 *      and which must stay blocked with a recorded pending balance.
 *
 * A hold is only released once its own fee is fully covered by payments; a
 * partially covered hold stays blocked but records how much is left. This is
 * deliberately independent of the existing "settle the whole account" rule, so
 * the current baseline behaviour is untouched.
 */

/** A billing hold as the allocator needs to see it (already scoped to one patient). */
export interface HoldForAllocation {
    id: number;
    /** Amount the lab order / prescription is billed for. */
    fee: number;
    /** Amount already applied against this hold by earlier payments. */
    paid?: number;
}

/** What a single payment does to one hold. */
export interface HoldAllocation {
    id: number;
    /** The hold's billed fee. */
    fee: number;
    /** Amount of *this* payment applied to the hold. */
    allocated: number;
    /** Cumulative amount paid on the hold after this payment. */
    paid: number;
    /** What the hold still owes after this payment (`fee - paid`). */
    balanceDue: number;
    /** True when the hold's fee is now fully covered. */
    fullyCovered: boolean;
}

/** Result of spreading one payment across a patient's holds. */
export interface PaymentAllocationResult {
    /** One entry per hold passed in, in the order supplied. */
    allocations: HoldAllocation[];
    /** Amount that could not be applied to any hold (becomes account credit). */
    unallocated: number;
    /** Total still owed across every hold after this payment. */
    totalBalanceDue: number;
    /** Number of holds whose fee is now fully covered. */
    releasedCount: number;
}

/** Money helper — keeps cents so floating point never invents a debt. */
const money = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

/**
 * Spread `amountUsd` across `holds` (callers pass them oldest-first) and report
 * what each hold still owes.
 *
 * The amount is consumed in order: each hold takes whatever it can up to its own
 * outstanding (`fee - paid`), and anything left over at the end is returned as
 * `unallocated` (a credit) rather than being silently dropped or over-applied.
 */
export function allocatePaymentToHolds(
    amountUsd: number,
    holds: HoldForAllocation[],
): PaymentAllocationResult {
    let remaining = money(amountUsd);
    if (remaining < 0) remaining = 0;

    const allocations: HoldAllocation[] = [];
    let totalBalanceDue = 0;
    let releasedCount = 0;

    for (const hold of holds) {
        const fee = money(hold.fee);
        // Never let an earlier overpayment (paid > fee) create a negative debt.
        const priorPaid = Math.min(money(hold.paid), fee);
        const outstanding = money(Math.max(0, fee - priorPaid));
        const applied = money(Math.min(remaining, outstanding));
        const paid = money(priorPaid + applied);
        const balanceDue = money(Math.max(0, fee - paid));
        const fullyCovered = balanceDue <= 0;

        remaining = money(remaining - applied);
        totalBalanceDue = money(totalBalanceDue + balanceDue);
        if (fullyCovered) releasedCount += 1;

        allocations.push({
            id: hold.id,
            fee,
            allocated: applied,
            paid,
            balanceDue,
            fullyCovered,
        });
    }

    return { allocations, unallocated: remaining, totalBalanceDue, releasedCount };
}

/**
 * Whether a hold's block should actually be lifted by an allocation.
 *
 * A zero-fee hold carries nothing to pay, so a payment must not be read as
 * clearing it — those remain blocked until billing reviews them, exactly as the
 * baseline behaves.
 */
export function shouldReleaseHold(allocation: HoldAllocation): boolean {
    return allocation.fullyCovered && allocation.fee > 0;
}
