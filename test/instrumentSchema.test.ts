import { describe, it, expect } from 'vitest'
import { validateInstrument, parseInstrumentJson } from '../server/utils/devil/instrumentSchema'
import { toPlayerInstrument } from '../server/utils/devil/playerView'
import { buildFallbackInstrument, INSTRUMENT_TEMPLATES } from '../server/utils/devil/instrumentTemplates'
import type { Instrument } from '../server/utils/devil/instrumentSchema'

function buildValidInstrument(): Instrument {
  return buildFallbackInstrument(INSTRUMENT_TEMPLATES[0])
}

describe('validateInstrument', () => {
  it('accepts a well-formed instrument', () => {
    const result = validateInstrument(buildValidInstrument())
    expect(result.isValid).toBe(true)
  })

  it('rejects non-object input', () => {
    expect(validateInstrument(null).isValid).toBe(false)
    expect(validateInstrument('instrument').isValid).toBe(false)
  })

  it('rejects a reference to a provision that does not exist', () => {
    const instrument = buildValidInstrument()
    instrument.provisions[0].references = ['99.9']
    const result = validateInstrument(instrument)
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('unknown-reference')
  })

  it('rejects an unknown controlling provision', () => {
    const instrument = buildValidInstrument()
    instrument.controllingProvisionIdentifiers = ['99.9']
    const result = validateInstrument(instrument)
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('unknown-controlling-provision')
  })

  it('rejects a controlling provision with no neutralization method', () => {
    const instrument = buildValidInstrument()
    instrument.neutralizationMethodByIdentifier = {}
    const result = validateInstrument(instrument)
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('missing-neutralization-method')
  })

  it('rejects an unknown severability provision', () => {
    const instrument = buildValidInstrument()
    instrument.severabilityProvisionIdentifiers = ['99.9']
    const result = validateInstrument(instrument)
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('unknown-severability-provision')
  })

  it('rejects an unknown substitution target', () => {
    const instrument = buildValidInstrument()
    instrument.severabilityProvisionIdentifiers = ['6.1']
    instrument.substitutionCoverageByIdentifier = { '6.1': ['99.9'] }
    const result = validateInstrument(instrument)
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('unknown-substitution-target')
  })

  it('accepts a wildcard substitution target', () => {
    const instrument = buildValidInstrument()
    instrument.severabilityProvisionIdentifiers = ['6.1']
    instrument.substitutionCoverageByIdentifier = { '6.1': ['*'] }
    expect(validateInstrument(instrument).isValid).toBe(true)
  })
})

describe('parseInstrumentJson', () => {
  it('parses a JSON body wrapped in prose', () => {
    const wrapped = 'Here:\n```json\n' + JSON.stringify(buildValidInstrument()) + '\n```'
    expect(parseInstrumentJson(wrapped).isValid).toBe(true)
  })

  it('fails gracefully on invalid JSON', () => {
    const result = parseInstrumentJson('not json')
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('unparseable')
  })
})

describe('toPlayerInstrument', () => {
  it('strips every server-only control field', () => {
    const instrument = buildValidInstrument()
    const playerView = toPlayerInstrument(instrument)
    const serialized = JSON.stringify(playerView)
    expect(serialized).not.toContain('controllingProvisionIdentifiers')
    expect(serialized).not.toContain('neutralizationMethodByIdentifier')
    expect(serialized).not.toContain('severabilityProvisionIdentifiers')
    expect(serialized).not.toContain('substitutionCoverageByIdentifier')
    expect(serialized).not.toContain('substitutionWordingByIdentifier')
    expect(serialized).not.toContain('trapSummary')
  })

  it('keeps every readable part of the document', () => {
    const instrument = buildValidInstrument()
    const playerView = toPlayerInstrument(instrument)
    expect(playerView.provisions).toHaveLength(instrument.provisions.length)
    expect(playerView.definitions).toHaveLength(instrument.definitions.length)
    expect(playerView.schedules).toHaveLength(instrument.schedules.length)
    expect(playerView.recitals).toBe(instrument.recitals)
  })
})
