import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { formatCurrency, roundAmount, parseAmount, calculateOrderTotals, calculateNetProfit, calculateProfitPerMember } from '../src/utils/money.js';

describe('Money Utilities', () => {
  describe('parseAmount', () => {
    test('parses valid numbers', () => {
      expect(parseAmount('100')).toBe(100);
      expect(parseAmount('100.50')).toBe(100.5);
      expect(parseAmount(100)).toBe(100);
    });

    test('handles currency symbols', () => {
      expect(parseAmount('$100')).toBe(100);
      expect(parseAmount('100 EGP')).toBe(100);
      expect(parseAmount('1,000')).toBe(1000);
    });

    test('returns 0 for invalid input', () => {
      expect(parseAmount('')).toBe(0);
      expect(parseAmount(null)).toBe(0);
      expect(parseAmount(undefined)).toBe(0);
      expect(parseAmount('abc')).toBe(0);
    });
  });

  describe('roundAmount', () => {
    test('rounds to 2 decimals by default', () => {
      // JavaScript's Math.round with Number.EPSILON for floating point precision
      // Note: Number.EPSILON causes 100.125 to round up to 100.13 instead of banker's rounding to 100.12
      expect(roundAmount(100.123)).toBe(100.12);
      expect(roundAmount(100.126)).toBe(100.13);
      expect(roundAmount(100.125)).toBe(100.13); // Number.EPSILON pushes it over the edge
    });

    test('rounds to specified decimals', () => {
      expect(roundAmount(100.1234, 3)).toBe(100.123);
      expect(roundAmount(100.1235, 3)).toBe(100.124);
    });
  });

  describe('formatCurrency', () => {
    test('formats EGP correctly', () => {
      const formatted = formatCurrency(1000, 'EGP', 'ar');
      // Arabic locale uses Arabic-Indic numerals
      expect(formatted).toContain('١٬٠٠٠');
    });

    test('formats USD correctly', () => {
      const formatted = formatCurrency(1000, 'USD', 'en');
      expect(formatted).toContain('1,000');
    });
  });

  describe('calculateOrderTotals', () => {
    test('calculates totals correctly', async () => {
      const items = [
        { quantity: 2, unitPrice: 100, manufacturingCost: 50 },
        { quantity: 1, unitPrice: 200, manufacturingCost: 80 },
      ];
      const result = await calculateOrderTotals(items, 50);

      expect(result.subtotal).toBe(400);
      expect(result.shipping).toBe(50);
      expect(result.total).toBe(450);
      expect(result.manufacturingCost).toBe(180);
    });

    test('handles empty items', async () => {
      const result = await calculateOrderTotals([], 0);
      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('calculateNetProfit', () => {
    test('calculates net profit correctly', () => {
      const profit = calculateNetProfit(5000, 2000, 500, 300);
      expect(profit).toBe(2200);
    });

    test('handles negative profit', () => {
      const profit = calculateNetProfit(1000, 2000, 500, 300);
      expect(profit).toBe(-1800);
    });
  });

  describe('calculateProfitPerMember', () => {
    test('divides profit by team size', () => {
      expect(calculateProfitPerMember(5000, 5)).toBe(1000);
    });

    test('returns 0 for negative profit', () => {
      expect(calculateProfitPerMember(-1000, 5)).toBe(0);
    });

    test('returns 0 for zero team size', () => {
      expect(calculateProfitPerMember(5000, 0)).toBe(0);
    });
  });
});



