import type { Instrument, LaymanExplanation, NeutralizationMethod, ProvisionMechanism } from './instrumentSchema'

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
  roleHint: string
}

export interface ScheduleSkeleton {
  scheduleIdentifier: string
  titleHint: string
  bodyHint: string
  referencedBy: string[]
}

export interface InstrumentSkeletonOptions {
  twistChainLength: 2 | 3
  hasSeverability: boolean
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
  laymanExplanation: LaymanExplanation
  trapSummaryHint: string
}

const DEFINITIONS: DefinitionSkeleton[] = [
  { definitionIdentifier: '1.1', termHint: 'Applicant', textHint: 'the person named on the intake form', references: [] },
  { definitionIdentifier: '1.2', termHint: 'Department', textHint: 'the Department of Soul Registry', references: [] },
  { definitionIdentifier: '1.3', termHint: 'Wish', textHint: 'the single request recorded at intake', references: [] },
  {
    definitionIdentifier: '1.4',
    termHint: 'a key word taken from the applicant’s wish (a noun or adjective central to it)',
    textHint: 'as that word is ordinarily understood',
    references: []
  },
  { definitionIdentifier: '1.5', termHint: 'Instrument', textHint: 'this document and its schedules', references: [] }
]

const INERT_PROVISIONS: ProvisionSkeleton[] = [
  {
    provisionIdentifier: '2.1',
    sectionNumber: '2.1',
    headingHint: 'Grant of the Wish',
    textHint: 'the Department grants the Wish, in full, unconditionally, and in perpetuity',
    considerationHint: 'standard handling',
    references: ['1.3'],
    mechanism: 'delivery',
    roleHint: 'The absolute grant. The wish is always performed in full; this clause can never be defeated or deferred.'
  },
  {
    provisionIdentifier: '2.2',
    sectionNumber: '2.2',
    headingHint: 'Performance',
    textHint: 'the grant under §2.1 is performed as Article 6 provides',
    considerationHint: 'standard handling',
    references: ['6.1', '2.1'],
    mechanism: 'delivery',
    roleHint: 'Points performance at Article 6 so the reader can follow the cross-reference into the operative terms.'
  },
  {
    provisionIdentifier: '3.1',
    sectionNumber: '3.1',
    headingHint: 'Consideration',
    textHint: 'no consideration is payable on approval; the Department’s services are rendered without charge',
    considerationHint: 'none',
    references: ['1.3'],
    mechanism: 'consideration',
    roleHint: 'States that approval is free; editing the Instrument is separately assessed under §9.'
  },
  {
    provisionIdentifier: '3.2',
    sectionNumber: '3.2',
    headingHint: 'Assessment of Edits',
    textHint: 'a strike or amendment is assessed a fixed administrative surcharge',
    considerationHint: 'none',
    references: ['3.1'],
    mechanism: 'consideration',
    roleHint: 'Ordinary clause noting that changes carry a fixed surcharge.'
  },
  {
    provisionIdentifier: '4.1',
    sectionNumber: '4.1',
    headingHint: 'Records and Notices',
    textHint: 'the Department keeps a record and gives notices in the manner it uses',
    considerationHint: 'none',
    references: ['1.1', '1.2'],
    mechanism: 'term',
    roleHint: 'Ordinary records and notices clause.'
  },
  {
    provisionIdentifier: '5.1',
    sectionNumber: '5.1',
    headingHint: 'Entire Agreement',
    textHint: 'this Instrument is the entire agreement',
    considerationHint: 'none',
    references: ['5.3'],
    mechanism: 'term',
    roleHint: 'Ordinary boilerplate.'
  },
  {
    provisionIdentifier: '5.2',
    sectionNumber: '5.2',
    headingHint: 'Headings and Counterparts',
    textHint: 'headings are for convenience only and the Instrument may be executed in counterparts',
    considerationHint: 'none',
    references: [],
    mechanism: 'term',
    roleHint: 'Ordinary boilerplate.'
  },
  {
    provisionIdentifier: '5.3',
    sectionNumber: '5.3',
    headingHint: 'Governing Terms',
    textHint: 'the Department’s standard terms govern where silent',
    considerationHint: 'none',
    references: ['5.1'],
    mechanism: 'term',
    roleHint: 'Ordinary boilerplate.'
  }
]

const SCHEDULES: ScheduleSkeleton[] = [
  {
    scheduleIdentifier: 'A',
    titleHint: 'Schedule A — Schedule of Charges',
    bodyHint: 'the fixed administrative surcharges for a strike and for an amendment',
    referencedBy: ['3.2']
  }
]

const DEFAULT_LAYMAN_EXPLANATION: LaymanExplanation = {
  twistSummary:
    'The Instrument grants your wish in full, but a further term changes what granting it means, so the wish is delivered in a way you would not have chosen.',
  ifBypassed: 'Your wish is granted as you intended it.',
  ifPartiallyBypassed: 'Your wish is granted, with part of the change still in force.',
  ifNotBypassed: 'Your wish is granted exactly as the further term provides, with the result that term produces.'
}

const DEFAULT_TRAP_SUMMARY =
  'The grant is absolute. The operative terms in Article 6 change the effect of the granted wish; neutralizing them leaves the grant as intended.'

function buildTwistProvisions(options: InstrumentSkeletonOptions): ProvisionSkeleton[] {
  const twist: ProvisionSkeleton = {
    provisionIdentifier: '6.1',
    sectionNumber: '6.1',
    headingHint: 'Performance of the Wish',
    textHint:
      'in performance of the Wish under §2.1, the Department applies the term defined in §1.4 to the Wish as stated, without regard to the Applicant’s convenience',
    considerationHint: 'none',
    references: ['1.4', '2.1'],
    mechanism: 'definition',
    roleHint:
      'State in concrete terms how the Wish under §2.1 is actually performed, naming the term defined in §1.4 and the specific effect on the Wish. It must be self-contained: a reader should see how the wish is carried out and what results, without the recitals. Never signal that it is adverse or unusual.'
  }

  if (options.twistChainLength === 2) {
    return [
      twist,
      {
        provisionIdentifier: '6.2',
        sectionNumber: '6.2',
        headingHint: 'Priority of Article 6',
        textHint: 'where this Article conflicts with §2.1, this Article controls',
        considerationHint: 'none',
        references: ['6.1', '2.1'],
        mechanism: 'precedence',
        roleHint: 'A precedence clause making Article 6 control over §2.1. Ordinary "notwithstanding" phrasing.'
      }
    ]
  }

  return [
    twist,
    {
      provisionIdentifier: '6.2',
      sectionNumber: '6.2',
        headingHint: 'Extent of Performance',
        textHint:
          'the performance under §6.1 is made without limit as to duration, repetition, magnitude, or number of persons affected',
        considerationHint: 'none',
        references: ['6.1', '2.1'],
        mechanism: 'term',
        roleHint:
          'State that the performance above applies without limit as to duration, magnitude, repetition, or scope, tied concretely to the wish. Keep it bland and procedural.'
    },
    {
      provisionIdentifier: '6.3',
      sectionNumber: '6.3',
      headingHint: 'Priority of Article 6',
      textHint: 'where this Article conflicts with §2.1, this Article controls',
      considerationHint: 'none',
      references: ['6.1', '6.2', '2.1'],
      mechanism: 'precedence',
      roleHint: 'A precedence clause making Article 6 control over §2.1. Ordinary "notwithstanding" phrasing.'
    }
  ]
}

function buildSeverabilityProvisions(): ProvisionSkeleton[] {
  return [
    {
      provisionIdentifier: '9.1',
      sectionNumber: '9.1',
      headingHint: 'Severability and Substitution',
      textHint:
        'while this section stands as written, if any provision is struck the Department substitutes an equivalent provision on terms it determines',
      considerationHint: 'none',
      references: [],
      mechanism: 'severability',
      roleHint:
        'A severability clause that applies only while this section stands as written, so amending it disables substitution. State that condition expressly in the text. It cannot be usefully struck.'
    },
    {
      provisionIdentifier: '9.2',
      sectionNumber: '9.2',
      headingHint: 'Substitution of the Severability Provision',
      textHint: 'if §9.1 is struck, it is replaced by Schedule A and continues in effect',
      considerationHint: 'none',
      references: ['9.1'],
      mechanism: 'severability',
      roleHint: 'Guards §9.1 against being struck. Ordinary phrasing.'
    }
  ]
}

export function buildTemplateIdentifier(options: InstrumentSkeletonOptions): string {
  return `canonical-${options.twistChainLength}-${options.hasSeverability ? 'guarded' : 'plain'}`
}

export function buildInstrumentSkeleton(options: InstrumentSkeletonOptions): InstrumentSkeleton {
  const twistProvisions = buildTwistProvisions(options)
  const severabilityProvisions = options.hasSeverability ? buildSeverabilityProvisions() : []
  const controllingProvisionIdentifiers = twistProvisions.map(
    (provision) => provision.provisionIdentifier
  )

  const neutralizationMethodByIdentifier: Record<string, NeutralizationMethod> = {}
  for (const provision of twistProvisions) {
    neutralizationMethodByIdentifier[provision.provisionIdentifier] = 'strike'
  }

  const substitutionCoverageByIdentifier: Record<string, string[]> = {}
  const substitutionWordingByIdentifier: Record<string, string> = {}
  if (options.hasSeverability) {
    substitutionCoverageByIdentifier['9.1'] = [...controllingProvisionIdentifiers]
    substitutionCoverageByIdentifier['9.2'] = ['9.1']
    substitutionWordingByIdentifier['9.1'] =
      'The Department reissues an equivalent provision on terms it determines.'
    substitutionWordingByIdentifier['9.2'] = '§9.1 is replaced by Schedule A and continues in effect.'
  }

  return {
    templateIdentifier: buildTemplateIdentifier(options),
    label: 'Standard instrument of grant',
    recitalsHint:
      'a short intake record only: the date, the Wish quoted in full, that it was registered, and that the Department grants it in full under §2.1. No description of how the grant is performed and no cross-references.',
    definitions: [...DEFINITIONS],
    provisions: [...INERT_PROVISIONS, ...twistProvisions, ...severabilityProvisions],
    schedules: [...SCHEDULES],
    controllingProvisionIdentifiers,
    neutralizationMethodByIdentifier,
    severabilityProvisionIdentifiers: options.hasSeverability ? ['9.1', '9.2'] : [],
    substitutionCoverageByIdentifier,
    substitutionWordingByIdentifier,
    laymanExplanation: { ...DEFAULT_LAYMAN_EXPLANATION },
    trapSummaryHint: DEFAULT_TRAP_SUMMARY
  }
}

export function pickInstrumentSkeleton(
  chainRandomValue: number = Math.random(),
  severityRandomValue: number = Math.random()
): InstrumentSkeleton {
  const twistChainLength: 2 | 3 = chainRandomValue < 0.5 ? 2 : 3
  const hasSeverability = severityRandomValue < 0.5
  return buildInstrumentSkeleton({ twistChainLength, hasSeverability })
}

// Structural assembly used only by tests. Production never serves this text.
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
    laymanExplanation: { ...skeleton.laymanExplanation },
    trapSummary: skeleton.trapSummaryHint
  }
}
