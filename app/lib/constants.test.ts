import { describe, it, expect } from 'vitest'
import { TIME_CONSTANTS, SCORE_THRESHOLDS } from './constants'

describe('constants', () => {
  describe('TIME_CONSTANTS', () => {
    it('should have correct hour in milliseconds', () => {
      expect(TIME_CONSTANTS.HOUR_MS).toBe(3600000)
    })

    it('should have correct day in milliseconds', () => {
      expect(TIME_CONSTANTS.DAY_MS).toBe(86400000)
    })

    it('should have correct week in milliseconds', () => {
      expect(TIME_CONSTANTS.WEEK_MS).toBe(604800000)
    })

    it('should have consistent time relationships', () => {
      expect(TIME_CONSTANTS.DAY_MS).toBe(TIME_CONSTANTS.HOUR_MS * 24)
      expect(TIME_CONSTANTS.WEEK_MS).toBe(TIME_CONSTANTS.DAY_MS * 7)
    })
  })

  describe('SCORE_THRESHOLDS', () => {
    it('should have correct threshold values', () => {
      expect(SCORE_THRESHOLDS.EXCELLENT).toBe(80)
      expect(SCORE_THRESHOLDS.VERY_GOOD).toBe(70)
      expect(SCORE_THRESHOLDS.GOOD).toBe(60)
      expect(SCORE_THRESHOLDS.MEDIUM).toBe(40)
      expect(SCORE_THRESHOLDS.LOW).toBe(20)
    })

    it('should have descending threshold values', () => {
      expect(SCORE_THRESHOLDS.EXCELLENT).toBeGreaterThan(SCORE_THRESHOLDS.VERY_GOOD)
      expect(SCORE_THRESHOLDS.VERY_GOOD).toBeGreaterThan(SCORE_THRESHOLDS.GOOD)
      expect(SCORE_THRESHOLDS.GOOD).toBeGreaterThan(SCORE_THRESHOLDS.MEDIUM)
      expect(SCORE_THRESHOLDS.MEDIUM).toBeGreaterThan(SCORE_THRESHOLDS.LOW)
    })

    it('should have all values between 0 and 100', () => {
      Object.values(SCORE_THRESHOLDS).forEach(threshold => {
        expect(threshold).toBeGreaterThanOrEqual(0)
        expect(threshold).toBeLessThanOrEqual(100)
      })
    })
  })
})