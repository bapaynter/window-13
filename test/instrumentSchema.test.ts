import { describe, it, expect } from 'vitest'
import { validateInstrument, parseInstrumentJson } from '../server/utils/devil/instrumentSchema'
import { toPlayerInstrument } from '../server/utils/devil/playerView'
import { buildFallbackInstrument, buildInstrumentSkeleton } from '../server/utils/devil/instrumentTemplates'
import type { Instrument } from '../server/utils/devil/instrumentSchema'

function buildValidInstrument(): Instrument {
  return buildFallbackInstrument(buildInstrumentSkeleton({ twistChainLength: 2, hasSeverability: false }))
}

describe('validateInstrument', () => {
  it('accepts a well-formed instrument', () => {
    expect(validateInstrument(buildValidInstrument()).isValid).toBe(true)
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
    expect(validateInstrument(instrument).rejectionReason).toBe('unknown-controlling-provision')
  })

  it('rejects a controlling provision with no neutralization method', () => {
    const instrument = buildValidInstrument()
    instrument.neutralizationMethodByIdentifier = {}
    expect(validateInstrument(instrument).rejectionReason).toBe('missing-neutralization-method')
  })

  it('rejects an unknown severability provision', () => {
    const instrument = buildValidInstrument()
    instrument.severabilityProvisionIdentifiers = ['99.9']
    expect(validateInstrument(instrument).rejectionReason).toBe('unknown-severability-provision')
  })

  it('rejects an unknown substitution target', () => {
    const instrument = buildValidInstrument()
    instrument.severabilityProvisionIdentifiers = ['6.1']
    instrument.substitutionCoverageByIdentifier = { '6.1': ['99.9'] }
    expect(validateInstrument(instrument).rejectionReason).toBe('unknown-substitution-target')
  })

  it('accepts a wildcard substitution target', () => {
    const instrument = buildValidInstrument()
    instrument.severabilityProvisionIdentifiers = ['6.1']
    instrument.substitutionCoverageByIdentifier = { '6.1': ['*'] }
    expect(validateInstrument(instrument).isValid).toBe(true)
  })

  it('rejects a missing layman explanation', () => {
    const instrument = buildValidInstrument() as unknown as Record<string, unknown>
    delete instrument.laymanExplanation
    expect(validateInstrument(instrument).rejectionReason).toBe('schema')
  })

  it('rejects an overlong layman string', () => {
    const instrument = buildValidInstrument()
    instrument.laymanExplanation.twistSummary = 'x'.repeat(501)
    expect(validateInstrument(instrument).rejectionReason).toBe('schema')
  })
})

describe('parseInstrumentJson', () => {
  it('parses a JSON body wrapped in prose', () => {
    const wrapped = 'Here:\n```json\n' + JSON.stringify(buildValidInstrument()) + '\n```'
    expect(parseInstrumentJson(wrapped).isValid).toBe(true)
  })

  it('fails gracefully on invalid JSON', () => {
    expect(parseInstrumentJson('not json').rejectionReason).toBe('unparseable')
  })
})

describe('toPlayerInstrument', () => {
  it('strips every server-only field, including the layman explanation', () => {
    const instrument = buildFallbackInstrument(
      buildInstrumentSkeleton({ twistChainLength: 3, hasSeverability: true })
    )
    const serialized = JSON.stringify(toPlayerInstrument(instrument))
    for (const forbidden of [
      'controllingProvisionIdentifiers',
      'neutralizationMethodByIdentifier',
      'severabilityProvisionIdentifiers',
      'substitutionCoverageByIdentifier',
      'substitutionWordingByIdentifier',
      'laymanExplanation',
      'trapSummary'
    ]) {
      expect(serialized).not.toContain(forbidden)
    }
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
