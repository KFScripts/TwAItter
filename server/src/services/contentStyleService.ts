export type ContentChannel = 'social' | 'dm' | 'trend';

export interface AgentVoiceInput {
  username: string;
  age?: number;
  bio?: string;
  profession?: string;
  accountType?: 'personal' | 'business' | 'software' | 'parody';
  personalityPrompt?: string;
  mood?: string;
}

export interface NaturalStyleBrief {
  voiceGuardrails: string[];
  shape: string;
  humor: string;
  texture: string;
  forbiddenHabits: string[];
}

const SOCIAL_SHAPES = [
  'osservazione secca, senza spiegare la morale',
  'micro-aneddoto concreto, come una cosa appena successa',
  'opinione mezza storta e molto personale',
  'domanda vera, nata da curiosità o fastidio, non da engagement bait',
  'frammento o pensiero lasciato volutamente un po’ sospeso',
  'lamento specifico e quotidiano, senza trasformarlo in una lezione',
  'one-liner asciutta; la battuta non va spiegata',
  'presa di posizione con una piccola contraddizione umana',
  'dettaglio osservato e reazione emotiva immediata',
  'risposta che aggancia una parola o un dettaglio preciso del messaggio altrui'
];

const DM_SHAPES = [
  'una risposta breve che riprende una parola precisa dell’altro',
  'un messaggio spezzato e spontaneo, senza introduzioni',
  'una reazione emotiva seguita da un dettaglio concreto',
  'una domanda naturale che porta avanti la conversazione',
  'una risposta sottintesa: non spiegare ciò che entrambi hanno già capito',
  'una battuta privata o una provocazione leggera, solo se il rapporto lo consente'
];

const TREND_SHAPES = [
  'un punto di vista personale sul trend, non un riassunto della notizia',
  'una conseguenza quotidiana o assurda del trend',
  'una critica secca a un dettaglio specifico',
  'una previsione molto personale e non autorevole',
  'un contrasto tra hype e realtà vissuta'
];

const TEXTURES = [
  'Ritmo irregolare: una frase corta va bene; non bilanciare ogni proposizione.',
  'Puoi usare minuscole, una frase nominale o una punteggiatura imperfetta se appartengono alla voce.',
  'Scegli parole che questa persona userebbe davvero; evita il vocabolario neutro da comunicato.',
  'Non lucidare troppo il testo: lascia una piccola esitazione, abbreviazione o ellissi naturale.',
  'Non nominare mestiere, città o interessi se non entrano organicamente nel pensiero.',
  'La voce viene prima della completezza: meglio una reazione parziale che una spiegazione esaustiva.'
];

const AI_CLICHES = [
  'cosa ne pensate',
  'voi cosa ne pensate',
  'che ne pensate',
  'è importante ricordare',
  'oggi più che mai',
  'in un mondo in cui',
  'il futuro è qui',
  'non si tratta solo',
  'game changer',
  'una vera rivoluzione',
  'riflettiamo su',
  'apre nuove prospettive',
  'fa riflettere'
];

function pick<T>(values: T[], random: () => number): T {
  return values[Math.floor(random() * values.length)] || values[0];
}

function containsAny(text: string, markers: string[]): boolean {
  return markers.some((marker) => text.includes(marker));
}

export function buildNaturalStyleBrief(
  agent: AgentVoiceInput,
  channel: ContentChannel,
  random: () => number = Math.random
): NaturalStyleBrief {
  const persona = `${agent.personalityPrompt || ''} ${agent.bio || ''} ${agent.mood || ''}`.toLowerCase();
  const sarcastic = containsAny(persona, ['sarcast', 'cinic', 'iron', 'satir', 'pungent', 'provocator']);
  const darkEligible = containsAny(persona, ['black humor', 'umorismo nero', 'humour noir', 'macabr']) ||
    (agent.accountType === 'parody' && sarcastic);
  const playful = containsAny(persona, ['divert', 'meme', 'scherz', 'giocos', 'battut']) || agent.accountType === 'parody';
  const humorRoll = random();

  let humor = 'Nessuna battuta obbligatoria: parla normalmente. Non cercare una punchline.';
  if (darkEligible && humorRoll < 0.08) {
    humor = 'Umorismo nero raro e asciutto, coerente col personaggio. Bersaglio: te stesso, l’assurdità della situazione o un’istituzione; mai vulnerabilità personali, lutti recenti, minori o gruppi protetti. Non spiegare la battuta.';
  } else if (sarcastic && humorRoll < 0.38) {
    humor = 'Sarcasmo sottile: meglio understatement, contrasto o finta serietà che insulto esplicito. Una sola stoccata, senza emoji che la segnalino.';
  } else if (playful && humorRoll < 0.28) {
    humor = 'Ironia leggera o autoironia, ma senza costruire tutto il testo attorno alla battuta.';
  }

  const shapes = channel === 'dm' ? DM_SHAPES : channel === 'trend' ? TREND_SHAPES : SOCIAL_SHAPES;
  const voiceGuardrails = [
    `Mantieni la voce specifica di @${agent.username}; non scrivere come un narratore neutro.`,
    'Non inserire automaticamente bio, città, lavoro e interessi nello stesso testo.',
    'Non trasformare ogni input in un’opinione brillante: sono ammesse banalità, esitazioni, silenzi e reazioni incompiute.'
  ];

  if (agent.age && agent.age >= 55) {
    voiceGuardrails.push('Non imitare forzatamente slang giovanile; usa il registro del personaggio senza caricaturizzarne l’età.');
  }
  if (agent.accountType === 'business' || agent.accountType === 'software') {
    voiceGuardrails.push('Non sembrare un comunicato marketing a meno che il contesto richieda davvero una comunicazione ufficiale.');
  }

  return {
    voiceGuardrails,
    shape: pick(shapes, random),
    humor,
    texture: pick(TEXTURES, random),
    forbiddenHabits: [
      'niente struttura fatto + mestiere/città + battuta finale',
      'niente terne ritmiche o elenchi di tre immagini solo per suonare arguto',
      'niente morale, riassunto, spiegazione della battuta o domanda finale di rito',
      'niente emoji-firma ripetuta; usane al massimo una e solo se appartiene davvero alla persona',
      'niente tono da assistente, giornalista generico o copywriter motivazionale'
    ]
  };
}

export function formatNaturalStyleBrief(brief: NaturalStyleBrief): string {
  return [
    'REGIA DI VOCE PER QUESTO SINGOLO MESSAGGIO:',
    ...brief.voiceGuardrails.map((rule) => `- ${rule}`),
    `- Forma scelta: ${brief.shape}.`,
    `- Umorismo: ${brief.humor}`,
    `- Texture: ${brief.texture}`,
    '- Tic da evitare:',
    ...brief.forbiddenHabits.map((rule) => `  * ${rule}`)
  ].join('\n');
}

function normalizeWords(text: string): string[] {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[@#][\p{L}\p{N}_]+/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const jaccard = intersection / (setA.size + setB.size - intersection);
  const containment = intersection / Math.min(setA.size, setB.size);
  return Math.max(jaccard, containment);
}

function openingKey(text: string): string {
  return normalizeWords(text).slice(0, 3).join(' ');
}

export function collectContentQualityIssues(
  content: string,
  recentContents: string[],
  channel: ContentChannel
): string[] {
  const issues: string[] = [];
  const trimmed = content.trim();
  const lowered = trimmed.toLowerCase();

  if (!trimmed) return ['testo vuoto'];
  if (channel !== 'dm' && trimmed.length > 280) issues.push('troppo lungo per un post naturale');
  if (channel === 'dm' && trimmed.length > 420) issues.push('DM troppo lungo e costruito');

  const cliché = AI_CLICHES.find((phrase) => lowered.includes(phrase));
  if (cliché) issues.push(`cliché da IA o engagement bait: “${cliché}”`);

  const words = normalizeWords(trimmed);
  const opening = openingKey(trimmed);
  for (const recent of recentContents.filter(Boolean).slice(0, 40)) {
    const recentWords = normalizeWords(recent);
    if (words.length >= 5 && recentWords.length >= 5 && jaccardSimilarity(words, recentWords) >= 0.68) {
      issues.push('troppo simile a un contenuto recente');
      break;
    }
  }

  if (opening && opening.split(' ').length === 3) {
    const repeatedOpeningCount = recentContents
      .slice(0, 20)
      .filter((recent) => openingKey(recent) === opening)
      .length;
    if (repeatedOpeningCount >= 2) {
      issues.push('ripete troppo spesso la stessa apertura di tre parole');
    }
  }

  const trailingEmoji = trimmed.match(/[\p{Extended_Pictographic}\uFE0F]+$/u)?.[0];
  if (trailingEmoji) {
    const repeatedSignature = recentContents.slice(0, 12).filter((item) => item.trim().endsWith(trailingEmoji)).length >= 2;
    if (repeatedSignature) issues.push(`ripete l’emoji-firma finale ${trailingEmoji}`);
  }

  return [...new Set(issues)];
}
