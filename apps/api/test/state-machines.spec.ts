import {
  BONUS_RECORD_TRANSITIONS,
  ORDER_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  SHIPMENT_TRANSITIONS,
  canTransition,
  nextStates,
} from '@ptg/types';

describe('order state machine', () => {
  it('allows the documented happy path', () => {
    expect(canTransition(ORDER_TRANSITIONS, 'DRAFT', 'PENDING_PAYMENT')).toBe(true);
    expect(canTransition(ORDER_TRANSITIONS, 'PENDING_PAYMENT', 'PAID')).toBe(true);
    expect(canTransition(ORDER_TRANSITIONS, 'PAID', 'PROCESSING')).toBe(true);
    expect(canTransition(ORDER_TRANSITIONS, 'PROCESSING', 'PACKED')).toBe(true);
    expect(canTransition(ORDER_TRANSITIONS, 'PACKED', 'SHIPPED')).toBe(true);
    expect(canTransition(ORDER_TRANSITIONS, 'SHIPPED', 'DELIVERED')).toBe(true);
  });

  it('rejects skipping states', () => {
    expect(canTransition(ORDER_TRANSITIONS, 'DRAFT', 'SHIPPED')).toBe(false);
    expect(canTransition(ORDER_TRANSITIONS, 'PENDING_PAYMENT', 'DELIVERED')).toBe(false);
  });

  it('rejects any transition out of a terminal state', () => {
    expect(nextStates(ORDER_TRANSITIONS, 'CANCELLED')).toHaveLength(0);
    expect(nextStates(ORDER_TRANSITIONS, 'REFUNDED')).toHaveLength(0);
  });

  it('rejects moving backwards', () => {
    expect(canTransition(ORDER_TRANSITIONS, 'PAID', 'PENDING_PAYMENT')).toBe(false);
    expect(canTransition(ORDER_TRANSITIONS, 'SHIPPED', 'PACKED')).toBe(false);
  });
});

describe('payment state machine', () => {
  it('allows PAID to move to REFUNDED or PARTIALLY_REFUNDED only', () => {
    expect(canTransition(PAYMENT_TRANSITIONS, 'PAID', 'REFUNDED')).toBe(true);
    expect(canTransition(PAYMENT_TRANSITIONS, 'PAID', 'PARTIALLY_REFUNDED')).toBe(true);
    expect(canTransition(PAYMENT_TRANSITIONS, 'PAID', 'PENDING')).toBe(false);
  });
});

describe('shipment state machine', () => {
  it('cannot re-enter PENDING after being packed', () => {
    expect(canTransition(SHIPMENT_TRANSITIONS, 'PACKED', 'PENDING')).toBe(false);
  });
});

describe('bonus record lifecycle', () => {
  it('a PENDING record can only be approved or rejected', () => {
    expect(canTransition(BONUS_RECORD_TRANSITIONS, 'PENDING', 'APPROVED')).toBe(true);
    expect(canTransition(BONUS_RECORD_TRANSITIONS, 'PENDING', 'REJECTED')).toBe(true);
    expect(canTransition(BONUS_RECORD_TRANSITIONS, 'PENDING', 'PAID')).toBe(false);
  });

  it('a record can be paid only once it is approved, then only reversed', () => {
    expect(canTransition(BONUS_RECORD_TRANSITIONS, 'APPROVED', 'PAID')).toBe(true);
    expect(canTransition(BONUS_RECORD_TRANSITIONS, 'PAID', 'REVERSED')).toBe(true);
    expect(canTransition(BONUS_RECORD_TRANSITIONS, 'PAID', 'PAID')).toBe(false);
  });
});
