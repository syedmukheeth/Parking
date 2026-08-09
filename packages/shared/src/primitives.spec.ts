import { describe, expect, it } from 'vitest';
import { booleanQuerySchema, paiseSchema, phoneSchema, vehicleNumberSchema } from './primitives';

describe('paiseSchema', () => {
  it('accepts non-negative integers', () => {
    expect(paiseSchema.parse(0)).toBe(0);
    expect(paiseSchema.parse(4000)).toBe(4000);
  });

  it('rejects floats - money is never a float (docs/DATA-MODEL.md)', () => {
    expect(paiseSchema.safeParse(40.5).success).toBe(false);
  });

  it('rejects negative amounts', () => {
    expect(paiseSchema.safeParse(-1).success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('accepts E.164 Indian numbers', () => {
    expect(phoneSchema.safeParse('+919876543210').success).toBe(true);
  });

  it('rejects numbers without the country code', () => {
    expect(phoneSchema.safeParse('9876543210').success).toBe(false);
  });

  it('rejects a landline-shaped number (must start 6-9)', () => {
    expect(phoneSchema.safeParse('+915876543210').success).toBe(false);
  });
});

describe('vehicleNumberSchema', () => {
  it('uppercases and strips whitespace', () => {
    expect(vehicleNumberSchema.parse('ap 39 ab 1234')).toBe('AP39AB1234');
  });

  it('rejects symbols', () => {
    expect(vehicleNumberSchema.safeParse('AP-39-AB-1234').success).toBe(false);
  });
});

describe('booleanQuerySchema', () => {
  it('parses the string "false" as false - not JS truthiness', () => {
    expect(booleanQuerySchema.parse('false')).toBe(false);
  });

  it('parses the string "true" as true', () => {
    expect(booleanQuerySchema.parse('true')).toBe(true);
  });

  it('passes through real booleans', () => {
    expect(booleanQuerySchema.parse(true)).toBe(true);
    expect(booleanQuerySchema.parse(false)).toBe(false);
  });
});
