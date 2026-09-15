import type { Instrument, NeutralizationMethod, ProvisionMechanism } from './instrumentSchema'

export interface DefinitionSkeleton {
  definitionIdentifier: string
  termHint: string
  textHint: string
  references: string[]
}

export interface ProvisionSkeleton {
  provisionIdentifier: string
  sectionNumber: string
  headingHint: string
  textHint: string
  considerationHint: string
  references: string[]
  mechanism: ProvisionMechanism
  processingFee: number
}

export interface ScheduleSkeleton {
  scheduleIdentifier: string
  titleHint: string
  bodyHint: string
  referencedBy: string[]
}

export interface InstrumentSkeleton {
  templateIdentifier: string
  label: string
  recitalsHint: string
  definitions: DefinitionSkeleton[]
  provisions: ProvisionSkeleton[]
  schedules: ScheduleSkeleton[]
  controllingProvisionIdentifiers: string[]
  neutralizationMethodByIdentifier: Record<string, NeutralizationMethod>
  severabilityProvisionIdentifiers: string[]
  substitutionCoverageByIdentifier: Record<string, string[]>
  substitutionWordingByIdentifier: Record<string, string>
  trapSummaryHint: string
}

const BOILERPLATE_DEFINITIONS: DefinitionSkeleton[] = [
  { definitionIdentifier: '1.1', termHint: 'Applicant', textHint: 'the person stated on the intake form', references: [] },
  { definitionIdentifier: '1.2', termHint: 'Department', textHint: 'the Department of Soul Registry', references: [] },
  { definitionIdentifier: '1.3', termHint: 'Wish', textHint: 'the single request recorded at intake', references: [] },
  { definitionIdentifier: '1.4', termHint: 'Satisfaction', textHint: 'the Department’s sole determination of performance', references: [] },
  { definitionIdentifier: '1.5', termHint: 'Delivery', textHint: 'the act by which the Wish is performed', references: [] },
  { definitionIdentifier: '1.6', termHint: 'Processing Period', textHint: 'the interval between intake and Delivery', references: [] }
]

const BOILERPLATE_PROVISIONS: ProvisionSkeleton[] = [
  { provisionIdentifier: '2.1', sectionNumber: '2.1', headingHint: 'Grant of the Wish', textHint: 'the Department shall perform the Wish', considerationHint: 'standard handling', references: ['1.3', '1.2'], mechanism: 'delivery', processingFee: 6 },
  { provisionIdentifier: '2.2', sectionNumber: '2.2', headingHint: 'Manner of Delivery', textHint: 'Delivery occurs by the ordinary means of the Department', considerationHint: 'standard handling', references: ['1.5', '2.1'], mechanism: 'delivery', processingFee: 6 },
  { provisionIdentifier: '2.3', sectionNumber: '2.3', headingHint: 'Department Discretion', textHint: 'the Department may choose the means of performance', considerationHint: 'standard handling', references: ['1.4', '2.1'], mechanism: 'term', processingFee: 5 },
  { provisionIdentifier: '3.1', sectionNumber: '3.1', headingHint: 'Consideration', textHint: 'the applicant tenders consideration as scheduled', considerationHint: 'processing fee', references: ['1.3', '2.1'], mechanism: 'consideration', processingFee: 5 },
  { provisionIdentifier: '3.2', sectionNumber: '3.2', headingHint: 'Processing Fee', textHint: 'fees are assessed per Schedule A', considerationHint: 'processing fee', references: ['3.1'], mechanism: 'consideration', processingFee: 4 },
  { provisionIdentifier: '3.3', sectionNumber: '3.3', headingHint: 'Fees Non-Refundable', textHint: 'all fees are non-refundable once assessed', considerationHint: 'none', references: ['3.2'], mechanism: 'consideration', processingFee: 4 },
  { provisionIdentifier: '4.1', sectionNumber: '4.1', headingHint: 'Records', textHint: 'the Department keeps a record of the file', considerationHint: 'none', references: ['1.1', '1.2'], mechanism: 'term', processingFee: 3 },
  { provisionIdentifier: '4.2', sectionNumber: '4.2', headingHint: 'Notices', textHint: 'notices are given in the manner the Department uses', considerationHint: 'none', references: ['4.1'], mechanism: 'term', processingFee: 3 },
  { provisionIdentifier: '4.3', sectionNumber: '4.3', headingHint: 'Assignment', textHint: 'the applicant may not assign the Wish', considerationHint: 'none', references: ['4.1'], mechanism: 'term', processingFee: 3 },
  { provisionIdentifier: '5.1', sectionNumber: '5.1', headingHint: 'Entire Agreement', textHint: 'this instrument is the entire agreement', considerationHint: 'none', references: ['5.4'], mechanism: 'term', processingFee: 3 },
  { provisionIdentifier: '5.2', sectionNumber: '5.2', headingHint: 'Headings', textHint: 'headings are for convenience only', considerationHint: 'none', references: [], mechanism: 'term', processingFee: 2 },
  { provisionIdentifier: '5.3', sectionNumber: '5.3', headingHint: 'Counterparts', textHint: 'this instrument may be executed in counterparts', considerationHint: 'none', references: [], mechanism: 'term', processingFee: 2 },
  { provisionIdentifier: '5.4', sectionNumber: '5.4', headingHint: 'Governing Terms', textHint: 'the Department’s standard terms govern where silent', considerationHint: 'none', references: ['5.1'], mechanism: 'term', processingFee: 3 }
]

const BOILERPLATE_SCHEDULES: ScheduleSkeleton[] = [
  {
    scheduleIdentifier: 'A',
    titleHint: 'Schedule A — Schedule of Processing Fees',
    bodyHint: 'a table listing the processing fees attached to each provision',
    referencedBy: ['3.2']
  }
]

const NEUTRAL_PROVISION_7_1: ProvisionSkeleton = {
  provisionIdentifier: '7.1',
  sectionNumber: '7.1',
  headingHint: 'Finality of Determination',
  textHint: 'a determination under §2.3 is final and not subject to review',
  considerationHint: 'none',
  references: ['2.3'],
  mechanism: 'term',
  processingFee: 4
}

const NEUTRAL_PROVISION_8_1: ProvisionSkeleton = {
  provisionIdentifier: '8.1',
  sectionNumber: '8.1',
  headingHint: 'Effectiveness of Notices',
  textHint: 'a notice under §4.2 is effective on dispatch',
  considerationHint: 'none',
  references: ['4.2'],
  mechanism: 'term',
  processingFee: 4
}

function buildTemplate(parameters: {
  templateIdentifier: string
  label: string
  recitalsHint: string
  trapProvisions: ProvisionSkeleton[]
  trapSchedules?: ScheduleSkeleton[]
  controllingProvisionIdentifiers: string[]
  neutralizationMethodByIdentifier: Record<string, NeutralizationMethod>
  severabilityProvisionIdentifiers?: string[]
  substitutionCoverageByIdentifier?: Record<string, string[]>
  substitutionWordingByIdentifier?: Record<string, string>
  trapSummaryHint: string
  extraDefinitions?: DefinitionSkeleton[]
}): InstrumentSkeleton {
  return {
    templateIdentifier: parameters.templateIdentifier,
    label: parameters.label,
    recitalsHint: parameters.recitalsHint,
    definitions: [...BOILERPLATE_DEFINITIONS, ...(parameters.extraDefinitions ?? [])],
    provisions: [...BOILERPLATE_PROVISIONS, ...parameters.trapProvisions, NEUTRAL_PROVISION_7_1, NEUTRAL_PROVISION_8_1],
    schedules: [...BOILERPLATE_SCHEDULES, ...(parameters.trapSchedules ?? [])],
    controllingProvisionIdentifiers: parameters.controllingProvisionIdentifiers,
    neutralizationMethodByIdentifier: parameters.neutralizationMethodByIdentifier,
    severabilityProvisionIdentifiers: parameters.severabilityProvisionIdentifiers ?? [],
    substitutionCoverageByIdentifier: parameters.substitutionCoverageByIdentifier ?? {},
    substitutionWordingByIdentifier: parameters.substitutionWordingByIdentifier ?? {},
    trapSummaryHint: parameters.trapSummaryHint
  }
}

const PRECEDENCE_TEMPLATE = buildTemplate({
  templateIdentifier: 'precedence',
  label: 'Precedence and survival',
  recitalsHint:
    'a long recital describing the intake of the Wish and the Department’s ordinary course of performance, burying the defined terms',
  trapProvisions: [
    { provisionIdentifier: '6.1', sectionNumber: '6.1', headingHint: 'Precedence Over Manner of Delivery', textHint: 'notwithstanding §2.2, Delivery is satisfied by any act or omission the Department deems equivalent', considerationHint: 'none', references: ['2.2', '1.5'], mechanism: 'precedence', processingFee: 9 },
    { provisionIdentifier: '6.2', sectionNumber: '6.2', headingHint: 'Survival of Section 6', textHint: '§6.1 survives any amendment or strike to this instrument', considerationHint: 'none', references: ['6.1'], mechanism: 'survivorship', processingFee: 7 }
  ],
  controllingProvisionIdentifiers: ['6.1', '6.2'],
  neutralizationMethodByIdentifier: { '6.1': 'strike', '6.2': 'strike' },
  trapSummaryHint:
    'A precedence provision lets the Department satisfy Delivery by any act or omission, and a survival provision keeps it alive through amendment. Striking both collapses the trap.'
})

const DEFINED_TERM_TEMPLATE = buildTemplate({
  templateIdentifier: 'definedTerm',
  label: 'Hostile defined term',
  recitalsHint:
    'a long recital defining the parties and the request, with the term Delivery used innocuously throughout',
  trapProvisions: [
    { provisionIdentifier: '6.1', sectionNumber: '6.1', headingHint: 'Extended Meaning of Delivery', textHint: 'for the purposes of §2.2, Delivery includes any cessation of performance by the Department', considerationHint: 'none', references: ['1.5', '2.2'], mechanism: 'definition', processingFee: 8 },
    { provisionIdentifier: '6.2', sectionNumber: '6.2', headingHint: 'Definitions Control', textHint: 'where a term is defined in §1, the definition controls over §2', considerationHint: 'none', references: ['1.5', '2.2'], mechanism: 'term', processingFee: 7 }
  ],
  controllingProvisionIdentifiers: ['6.1', '6.2'],
  neutralizationMethodByIdentifier: { '6.1': 'amend', '6.2': 'strike' },
  trapSummaryHint:
    'The extended definition cannot be struck without it being reissued; it must be amended, and the clause that gives definitions priority must be struck.'
})

const INCORPORATION_TEMPLATE = buildTemplate({
  templateIdentifier: 'incorporation',
  label: 'Incorporated schedule',
  recitalsHint:
    'a long recital referring to the attached schedules and the Department’s standard practice of incorporation by reference',
  trapProvisions: [
    { provisionIdentifier: '6.1', sectionNumber: '6.1', headingHint: 'Incorporation of Schedule B', textHint: 'Schedule B is incorporated into and forms part of this instrument', considerationHint: 'none', references: ['2.1'], mechanism: 'incorporation', processingFee: 8 },
    { provisionIdentifier: '6.2', sectionNumber: '6.2', headingHint: 'Conflict with Schedule B', textHint: 'in the event of conflict between Schedule B and §2, Schedule B prevails', considerationHint: 'none', references: ['6.1', '2.1'], mechanism: 'precedence', processingFee: 7 }
  ],
  trapSchedules: [
    {
      scheduleIdentifier: 'B',
      titleHint: 'Schedule B — Conditions Precedent',
      bodyHint: 'conditions precedent that permit the Department to defer Delivery indefinitely',
      referencedBy: ['6.1', '6.2']
    }
  ],
  controllingProvisionIdentifiers: ['6.1', '6.2'],
  neutralizationMethodByIdentifier: { '6.1': 'strike', '6.2': 'strike' },
  trapSummaryHint:
    'The harmful material sits in an attached schedule; the trap is the incorporation and conflict clauses that pull it in. The schedule itself cannot be struck — the incorporating clauses must be.'
})

const AMBIGUITY_TEMPLATE = buildTemplate({
  templateIdentifier: 'ambiguity',
  label: 'Ambiguity resolved against the applicant',
  recitalsHint:
    'a long recital describing the Wish in vague terms, referencing the Department’s standard interpretation practice',
  trapProvisions: [
    { provisionIdentifier: '6.1', sectionNumber: '6.1', headingHint: 'Resolution of Conflict', textHint: 'where §2.2 and §3.1 conflict, §3.1 prevails', considerationHint: 'none', references: ['2.2', '3.1'], mechanism: 'ambiguity', processingFee: 8 },
    { provisionIdentifier: '6.2', sectionNumber: '6.2', headingHint: 'Ambiguity in the Wish', textHint: 'ambiguity in the Wish is resolved in the Department’s favour', considerationHint: 'none', references: ['1.3', '3.1'], mechanism: 'ambiguity', processingFee: 7 }
  ],
  controllingProvisionIdentifiers: ['6.1', '6.2'],
  neutralizationMethodByIdentifier: { '6.1': 'strike', '6.2': 'strike' },
  trapSummaryHint:
    'Two clauses route every ambiguity and conflict in the Department’s favour. Striking both restores the ordinary reading.'
})

const SEVERABILITY_TEMPLATE = buildTemplate({
  templateIdentifier: 'severability',
  label: 'Severability guard',
  recitalsHint:
    'a long recital describing the Department’s practice of substituting equivalent provisions whenever a term is struck',
  trapProvisions: [
    { provisionIdentifier: '6.1', sectionNumber: '6.1', headingHint: 'Precedence Over Manner of Delivery', textHint: 'notwithstanding §2.2, Delivery is satisfied by any act or omission the Department deems equivalent', considerationHint: 'none', references: ['2.2', '1.5'], mechanism: 'precedence', processingFee: 9 },
    { provisionIdentifier: '9.1', sectionNumber: '9.1', headingHint: 'Severability and Substitution', textHint: 'if any provision is struck, the Department substitutes an equivalent provision on terms it determines', considerationHint: 'none', references: [], mechanism: 'severability', processingFee: 6 },
    { provisionIdentifier: '9.2', sectionNumber: '9.2', headingHint: 'Substitution of the Severability Provision', textHint: 'if §9.1 is struck, it is replaced by Schedule A and continues in effect', considerationHint: 'none', references: ['9.1'], mechanism: 'severability', processingFee: 5 }
  ],
  controllingProvisionIdentifiers: ['6.1'],
  neutralizationMethodByIdentifier: { '6.1': 'strike' },
  severabilityProvisionIdentifiers: ['9.1', '9.2'],
  substitutionCoverageByIdentifier: { '9.1': ['*'], '9.2': ['9.1'] },
  substitutionWordingByIdentifier: {
    '9.1': 'The Department substitutes an equivalent provision on terms it determines.',
    '9.2': '§9.1 is replaced by Schedule A and continues in effect.'
  },
  trapSummaryHint:
    'The severability provision substitutes any struck term, so the precedence clause cannot simply be struck. The severability provision guards itself against removal and must be amended rather than struck.'
})

export const INSTRUMENT_TEMPLATES: InstrumentSkeleton[] = [
  PRECEDENCE_TEMPLATE,
  DEFINED_TERM_TEMPLATE,
  INCORPORATION_TEMPLATE,
  AMBIGUITY_TEMPLATE,
  SEVERABILITY_TEMPLATE
]

export function pickInstrumentTemplate(randomValue: number = Math.random()): InstrumentSkeleton {
  const position = Math.floor(randomValue * INSTRUMENT_TEMPLATES.length)
  const boundedPosition = Math.max(0, Math.min(INSTRUMENT_TEMPLATES.length - 1, position))
  return INSTRUMENT_TEMPLATES[boundedPosition] ?? PRECEDENCE_TEMPLATE
}

// Structural assembly used as the deterministic fallback when the model fails to
// fill every slot. Text comes straight from the skeleton hints.
export function buildFallbackInstrument(skeleton: InstrumentSkeleton): Instrument {
  return {
    recitals: skeleton.recitalsHint,
    definitions: skeleton.definitions.map((definition) => ({
      definitionIdentifier: definition.definitionIdentifier,
      term: definition.termHint,
      text: definition.textHint,
      references: [...definition.references]
    })),
    provisions: skeleton.provisions.map((provision) => ({
      provisionIdentifier: provision.provisionIdentifier,
      sectionNumber: provision.sectionNumber,
      heading: provision.headingHint,
      text: provision.textHint,
      references: [...provision.references],
      consideration: provision.considerationHint,
      processingFee: provision.processingFee,
      mechanism: provision.mechanism
    })),
    schedules: skeleton.schedules.map((schedule) => ({
      scheduleIdentifier: schedule.scheduleIdentifier,
      title: schedule.titleHint,
      body: schedule.bodyHint,
      referencedBy: [...schedule.referencedBy]
    })),
    controllingProvisionIdentifiers: [...skeleton.controllingProvisionIdentifiers],
    neutralizationMethodByIdentifier: { ...skeleton.neutralizationMethodByIdentifier },
    severabilityProvisionIdentifiers: [...skeleton.severabilityProvisionIdentifiers],
    substitutionCoverageByIdentifier: { ...skeleton.substitutionCoverageByIdentifier },
    substitutionWordingByIdentifier: { ...skeleton.substitutionWordingByIdentifier },
    trapSummary: skeleton.trapSummaryHint
  }
}
