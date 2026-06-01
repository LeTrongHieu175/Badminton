import fs from 'node:fs/promises';

const markdownPath = 'TEST_CASE_TREE.md';
const mergedResultsPath = 'artifacts/test-results.json';

function sanitize(value) {
  return String(value || '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>')
    .trim();
}

async function main() {
  const [apiResults, uiResults, markdown] = await Promise.all([
    fs.readFile('artifacts/api-test-results.json', 'utf8').then(JSON.parse),
    fs.readFile('artifacts/ui-test-results.json', 'utf8').then(JSON.parse),
    fs.readFile(markdownPath, 'utf8')
  ]);

  const mergedResults = {
    ...apiResults,
    ...uiResults
  };

  const nextMarkdown = markdown
    .split('\n')
    .map((line) => {
      const match = line.match(/^\|\s*(TC_[A-Z0-9_]+)\s*\|/);
      if (!match) {
        return line;
      }

      const testId = match[1];
      const result = mergedResults[testId];
      if (!result) {
        return line;
      }

      const cells = line.split('|');
      if (cells.length < 10) {
        return line;
      }

      cells[7] = ` ${sanitize(result.actual)} `;
      cells[8] = ` ${sanitize(result.status)} `;
      return cells.join('|');
    })
    .join('\n');

  await Promise.all([
    fs.writeFile(markdownPath, nextMarkdown),
    fs.writeFile(mergedResultsPath, JSON.stringify(mergedResults, null, 2))
  ]);

  console.log(JSON.stringify({ markdownPath, mergedResultsPath, count: Object.keys(mergedResults).length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
