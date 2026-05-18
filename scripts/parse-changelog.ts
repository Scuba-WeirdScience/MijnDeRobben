#!/usr/bin/env node
/**
 * parse-changelog.ts
 *
 * Parses CHANGELOG.md (Keep a Changelog format) and:
 *   1. Writes frontend/public/assets/release-notes.json
 *   2. Updates the <meta name="app-version"> in frontend/src/index.html
 *      to match the latest version in the changelog.
 *
 * Run via:  node --experimental-strip-types scripts/parse-changelog.ts
 * Or via npm script (from frontend/): npm run generate:release-notes
 *
 * Workflow:
 *   1. Bump appData.version in frontend/ngsw-config.json
 *   2. Add a ## [x.y.z] section to CHANGELOG.md
 *   3. Run npm run generate:release-notes
 *   4. ng build && firebase deploy --only hosting
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'CHANGELOG.md');
const OUTPUT_PATH = path.join(REPO_ROOT, 'frontend', 'public', 'assets', 'release-notes.json');
const INDEX_HTML_PATH = path.join(REPO_ROOT, 'frontend', 'src', 'index.html');

interface ReleaseSection {
  heading: string;
  items: string[];
}

interface ReleaseEntry {
  version: string;
  date: string;
  sections: ReleaseSection[];
}

function parseChangelog(content: string): ReleaseEntry[] {
  const entries: ReleaseEntry[] = [];
  const lines = content.split('\n');

  let currentEntry: ReleaseEntry | null = null;
  let currentSection: ReleaseSection | null = null;

  for (const line of lines) {
    const versionMatch = line.match(/^## \[(\d+\.\d+\.\d+)\]\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (versionMatch) {
      if (currentSection && currentEntry) currentEntry.sections.push(currentSection);
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { version: versionMatch[1], date: versionMatch[2], sections: [] };
      currentSection = null;
      continue;
    }

    if (!currentEntry) continue;

    const sectionMatch = line.match(/^### (.+)/);
    if (sectionMatch) {
      if (currentSection) currentEntry.sections.push(currentSection);
      currentSection = { heading: sectionMatch[1].trim(), items: [] };
      continue;
    }

    const itemMatch = line.match(/^[-*] (.+)/);
    if (itemMatch && currentSection) {
      currentSection.items.push(itemMatch[1].trim());
    }
  }

  // Flush last section/entry
  if (currentSection && currentEntry) currentEntry.sections.push(currentSection);
  if (currentEntry) entries.push(currentEntry);

  // Only include entries that have at least one section with items
  return entries.filter(e => e.sections.some(s => s.items.length > 0));
}

function updateIndexHtmlVersion(version: string): void {
  let html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
  const updated = html.replace(
    /(<meta\s+name="app-version"\s+content=")[^"]*(")/,
    `$1${version}$2`,
  );
  if (updated === html) {
    console.warn('[parse-changelog] Warning: could not find <meta name="app-version"> in index.html');
    return;
  }
  fs.writeFileSync(INDEX_HTML_PATH, updated, 'utf-8');
  console.log(`[parse-changelog] Updated app-version meta tag to ${version}`);
}

const raw = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
const entries = parseChangelog(raw);

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2) + '\n', 'utf-8');
console.log(`[parse-changelog] Wrote ${entries.length} entries to ${OUTPUT_PATH}`);

if (entries.length > 0) {
  updateIndexHtmlVersion(entries[0].version);
}
