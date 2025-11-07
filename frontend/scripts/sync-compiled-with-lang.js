// We are using AI to translate compiled files we should sync the files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const languages = [
  'de-DE',
  'en-US',
  'es-ES',
  'fr-FR',
  'it-IT',
  'nn-NO',
  'pt-BR',
  'cs-CZ',
];

const projectRoot = path.resolve(__dirname, '..');

for (let index = 0; index < languages.length; index++) {
  const lang = languages[index];
  const langFile = JSON.parse(fs.readFileSync(path.join(projectRoot, `lang/${lang}.json`), 'utf-8'));
  const compiledFile = {};

  // Convert from lang format { "key": { "defaultMessage": "value" } } 
  // to compiled format { "key": "value" }
  for (const key in langFile) {
    if (langFile[key] && langFile[key].defaultMessage) {
      compiledFile[key] = langFile[key].defaultMessage;
    }
  }

  fs.writeFileSync(
    path.join(projectRoot, `compiled-lang/${lang}.json`),
    JSON.stringify(compiledFile, null, 2) + '\n',
    'utf-8'
  );

  console.log(`✓ Synced ${lang}`);
}

console.log('All language files synced successfully!');
