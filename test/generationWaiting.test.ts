import { describe, it, expect } from 'vitest'
import {
  WAITING_STATUS_LINES,
  selectWaitingStatusLine,
  formatElapsedDuration
} from '../app/utils/generationWaiting'

describe('selectWaitingStatusLine', () => {
  it('returns the first line at the start', () => {
    expect(selectWaitingStatusLine(0)).toBe(WAITING_STATUS_LINES[0])
  })

  it('advances to the next line after the interval', () => {
    expect(selectWaitingStatusLine(4000)).toBe(WAITING_STATUS_LINES[1])
  })

  it('wraps around', () => {
    const wrapPosition = WAITING_STATUS_LINES.length * 4000
    expect(selectWaitingStatusLine(wrapPosition)).toBe(WAITING_STATUS_LINES[0])
  })

  it('never returns undefined', () => {
    for (let elapsed = 0; elapsed < 60000; elapsed += 500) {
      expect(typeof selectWaitingStatusLine(elapsed)).toBe('string')
    }
  })
})

describe('formatElapsedDuration', () => {
  it('formats sub-minute durations as m:ss', () => {
    expect(formatElapsedDuration(0)).toBe('0:00')
    expect(formatElapsedDuration(9000)).toBe('0:09')
  })

  it('formats multi-minute durations', () => {
    expect(formatElapsedDuration(65000)).toBe('1:05')
    expect(formatElapsedDuration(600000)).toBe('10:00')
  })

  it('clamps negative durations to zero', () => {
    expect(formatElapsedDuration(-5000)).toBe('0:00')
  })
})
