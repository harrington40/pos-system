import {
    allocatePaymentToHolds,
    shouldReleaseHold,
    type HoldForAllocation,
} from './billing-payment-allocation.util';

/**
 * Regression tests for the partial-payment decisions.
 *
 * The workflow this protects: a patient pays part of the bill, the lab order /
 * prescription it fully covers is unblocked, and everything still owed is
 * recorded — either as a per-hold balance or as an account credit.
 */
describe('billing payment allocation', () => {
    const hold = (id: number, fee: number, paid = 0): HoldForAllocation => ({
        id,
        fee,
        paid,
    });

    describe('allocatePaymentToHolds', () => {
        it('leaves every hold with its full balance when nothing is paid', () => {
            const out = allocatePaymentToHolds(0, [hold(1, 10), hold(2, 25)]);
            expect(out.allocations.map((a) => a.balanceDue)).toEqual([10, 25]);
            expect(out.unallocated).toBe(0);
            expect(out.totalBalanceDue).toBe(35);
            expect(out.releasedCount).toBe(0);
        });

        it('fully covers the first hold and leaves the rest owed', () => {
            const out = allocatePaymentToHolds(12, [hold(1, 10), hold(2, 25)]);
            expect(out.allocations[0]).toMatchObject({
                id: 1,
                allocated: 10,
                paid: 10,
                balanceDue: 0,
                fullyCovered: true,
            });
            expect(out.allocations[1]).toMatchObject({
                id: 2,
                allocated: 2,
                paid: 2,
                balanceDue: 23,
                fullyCovered: false,
            });
            expect(out.totalBalanceDue).toBe(23);
            expect(out.releasedCount).toBe(1);
        });

        it('records the pending balance when a payment only partly covers a hold', () => {
            const out = allocatePaymentToHolds(4, [hold(1, 10)]);
            expect(out.allocations[0]).toMatchObject({
                allocated: 4,
                paid: 4,
                balanceDue: 6,
                fullyCovered: false,
            });
            expect(out.releasedCount).toBe(0);
        });

        it('accumulates against what a hold was already paid', () => {
            const out = allocatePaymentToHolds(5, [hold(1, 10, 5)]);
            expect(out.allocations[0]).toMatchObject({
                allocated: 5,
                paid: 10,
                balanceDue: 0,
                fullyCovered: true,
            });
        });

        it('returns an overpayment as credit instead of pushing a balance negative', () => {
            const out = allocatePaymentToHolds(40, [hold(1, 10), hold(2, 10)]);
            expect(out.allocations.map((a) => a.balanceDue)).toEqual([0, 0]);
            expect(out.unallocated).toBe(20);
            expect(out.totalBalanceDue).toBe(0);
            expect(out.releasedCount).toBe(2);
        });

        it('handles fractional amounts without floating point drift', () => {
            const out = allocatePaymentToHolds(2.07, [hold(1, 2.07)]);
            expect(out.allocations[0].balanceDue).toBe(0);
            expect(out.allocations[0].fullyCovered).toBe(true);
            expect(out.unallocated).toBe(0);
        });

        it('ignores a prior overpayment rather than crediting it forward', () => {
            const out = allocatePaymentToHolds(0, [hold(1, 10, 15)]);
            expect(out.allocations[0]).toMatchObject({
                balanceDue: 0,
                fullyCovered: true,
            });
        });

        it('treats a negative amount as nothing paid', () => {
            const out = allocatePaymentToHolds(-5, [hold(1, 10)]);
            expect(out.allocations[0].allocated).toBe(0);
            expect(out.allocations[0].balanceDue).toBe(10);
        });
    });

    describe('shouldReleaseHold', () => {
        it('releases a covered hold with a real fee', () => {
            const [a] = allocatePaymentToHolds(10, [hold(1, 10)]).allocations;
            expect(shouldReleaseHold(a)).toBe(true);
        });

        it('keeps a partly paid hold blocked', () => {
            const [a] = allocatePaymentToHolds(4, [hold(1, 10)]).allocations;
            expect(shouldReleaseHold(a)).toBe(false);
        });

        it('does not release a zero-fee hold on the back of a payment', () => {
            const [a] = allocatePaymentToHolds(10, [hold(1, 0)]).allocations;
            expect(a.fullyCovered).toBe(true);
            expect(shouldReleaseHold(a)).toBe(false);
        });
    });
});
