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
  'Scrivi come se avessi aperto il telefono per dieci secondi: vai subito al punto che ti è rimasto in testa.',
  'Preferisci un verbo o un dettaglio concreto a parole astratte e aggettivi generici.',
  'Se il pensiero è semplice, lascialo semplice: non aggiungere una seconda frase per renderlo importante.',
  'In una risposta puoi omettere ciò che è già chiaro dalla conversazione, come fanno le persone vere.',
  'Usa il ritmo abituale del personaggio, anche quando significa minuscole, una frase nominale o poche parole.',
  'Lascia che il tono venga dalla reazione reale del personaggio, non da una costruzione retorica perfetta.'
];

const AI_CLICHES = [
  'è importante ricordare',
  'oggi più che mai',
  'in un mondo in cui',
  'il futuro è qui',
  'non si tratta solo',
  'game changer',
  'una vera rivoluzione',
  'riflettiamo su',
  'apre nuove prospettive'
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
    `Fai parlare @${agent.username} con il suo lessico e il suo carattere, non con una voce social generica.`,
    'Parti da una reazione precisa: qualcosa che nota, vuole, teme, ricorda, contesta o trova ridicolo in questo momento.',
    'Il risultato deve sembrare sensato anche se nessuno mette like: niente performance obbligatoria per il pubblico.'
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
      'non comprimere cronaca, biografia del profilo e battuta nello stesso messaggio',
      'non spiegare la morale o la battuta e non chiudere automaticamente con una domanda al pubblico',
      'non usare tono da assistente, comunicato o mini-editoriale se il personaggio non parla così'
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
    '- Controllo rapido prima di inviare:',
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

function similarityScores(a: string[], b: string[]): { jaccard: number; containment: number } {
  const setA = new Set(a);
  const setB = new Set(b);
  if (!setA.size || !setB.size) return { jaccard: 0, containment: 0 };
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  return {
    jaccard: intersection / (setA.size + setB.size - intersection),
    containment: intersection / Math.min(setA.size, setB.size)
  };
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
    const similarity = similarityScores(words, recentWords);
    const sameCoreSentence = similarity.containment >= 0.9 && Math.abs(words.length - recentWords.length) <= 3;
    if (
      words.length >= 5 &&
      recentWords.length >= 5 &&
      (similarity.jaccard >= 0.72 || sameCoreSentence)
    ) {
      issues.push('troppo simile a un contenuto recente');
      break;
    }
  }

  if (opening && opening.split(' ').length === 3) {
    const repeatedOpeningCount = recentContents
      .slice(0, 20)
      .filter((recent) => openingKey(recent) === opening)
      .length;
    if (repeatedOpeningCount >= 3) {
      issues.push('ripete troppo spesso la stessa apertura di tre parole');
    }
  }

  const trailingEmoji = trimmed.match(/[\p{Extended_Pictographic}\uFE0F]+$/u)?.[0];
  if (trailingEmoji) {
    const repeatedSignature = recentContents.slice(0, 15).filter((item) => item.trim().endsWith(trailingEmoji)).length >= 3;
    if (repeatedSignature) issues.push(`ripete l’emoji-firma finale ${trailingEmoji}`);
  }

  return [...new Set(issues)];
}
