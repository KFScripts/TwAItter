const assert = require('node:assert/strict');
const {
  buildNaturalStyleBrief,
  collectContentQualityIssues
} = require('../dist/services/contentStyleService');

const sarcasticBrief = buildNaturalStyleBrief(
  {
    username: 'trenoveloce_satira',
    accountType: 'parody',
    personalityPrompt: 'Account satirico, sarcastico e cinico',
    mood: 'sarcastic'
  },
  'social',
  () => 0.03
);
assert.match(sarcasticBrief.humor, /Umorismo nero raro/);
assert.match(sarcasticBrief.humor, /mai vulnerabilità personali/);

const neutralBrief = buildNaturalStyleBrief(
  {
    username: 'persona_normale',
    accountType: 'personal',
    personalityPrompt: 'Persona pacata e concreta',
    mood: 'focused'
  },
  'social',
  () => 0.9
);
assert.match(neutralBrief.humor, /Nessuna battuta obbligatoria/);

const sarcasticButNotDarkBrief = buildNaturalStyleBrief(
  {
    username: 'ironico_normale',
    accountType: 'personal',
    personalityPrompt: 'Persona sarcastica e pungente',
    mood: 'sarcastic'
  },
  'social',
  () => 0.03
);
assert.doesNotMatch(sarcasticButNotDarkBrief.humor, /Umorismo nero/);
assert.match(sarcasticButNotDarkBrief.humor, /Sarcasmo sottile/);

const clichéIssues = collectContentQualityIssues(
  'Il futuro è qui: una vera rivoluzione. Voi cosa ne pensate?',
  [],
  'social'
);
assert.ok(clichéIssues.some((issue) => issue.includes('cliché')));

const duplicateIssues = collectContentQualityIssues(
  'la grandine ha distrutto diecimila auto in pochi minuti',
  ['La grandine ha distrutto 10mila auto in pochi minuti a Cremona'],
  'social'
);
assert.ok(duplicateIssues.includes('troppo simile a un contenuto recente'));

const emojiIssues = collectContentQualityIssues(
  'anche oggi benissimo 💀',
  ['ieri un capolavoro 💀', 'tutto regolare 💀'],
  'social'
);
assert.ok(emojiIssues.some((issue) => issue.includes('emoji-firma')));

const ordinaryListIssues = collectContentQualityIssues(
  'pane, latte, detersivo e la dignità la prendiamo domani',
  [],
  'social'
);
assert.deepEqual(ordinaryListIssues, []);

const singleOpeningReuseIssues = collectContentQualityIssues(
  'ma che freddo fa qui dentro',
  ['ma che caldo fa in officina'],
  'social'
);
assert.deepEqual(singleOpeningReuseIssues, []);

const naturalIssues = collectContentQualityIssues(
  'il vicino ha ricominciato col trapano. ormai paga l’affitto pure lui',
  ['Piove da stamattina e ho lasciato le scarpe fuori. Geniale.'],
  'social'
);
assert.deepEqual(naturalIssues, []);

console.log('contentStyleService: 9 test superati');
