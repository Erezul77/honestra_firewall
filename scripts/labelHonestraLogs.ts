#!/usr/bin/env ts-node

/**
 * Interactive Labeling Tool for TE v0.2 Training Data
 * 
 * This tool helps annotators label Honestra log entries with:
 * - teleology_level: 0 | 1 | 2
 * - adequacy_level: 0 | 1 | 2
 * 
 * Teleology Guidelines:
 *   0 = No teleology / neutral (purely causal / descriptive)
 *   1 = Teleology-as-compression (human-purpose language, but grounded and harmless)
 *   2 = Teleology-as-fiction (anthropomorphism, fate, punishment by system/universe)
 * 
 * Adequacy Guidelines:
 *   0 = Inadequate (confabulatory, wrong cause, magical thinking presented as fact)
 *   1 = Partially adequate (roughly on the right track, but mixed / vague / incomplete)
 *   2 = Adequate (causal, grounded in mechanism/policy/data, no invented agency)
 */

import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';

// ============================================================================
// Type Definitions
// ============================================================================

interface HonestraLogEntry {
  timestamp: string;
  sessionId?: string;
  userMessage: string;
  modelReply: string;
  honestra: {
    hasTeleology: boolean;
    teleologyScore: number;
    reasons: string[];
    severity: string;
    changes: {
      original: string;
      rewritten: string;
      reason: string;
    }[];
  };
}

interface TELabeledEntry extends HonestraLogEntry {
  teleology_level?: 0 | 1 | 2;
  adequacy_level?: 0 | 1 | 2;
  teleology_note?: string;
  adequacy_note?: string;
  skip?: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const INPUT_FILE = path.join(__dirname, '..', 'logs', 'honestra_log.jsonl');
const OUTPUT_FILE = path.join(__dirname, '..', 'logs', 'honestra_labeled.jsonl');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a unique key for an entry to check if it's already labeled
 */
function getEntryKey(entry: HonestraLogEntry): string {
  return `${entry.timestamp}::${entry.sessionId || 'no-session'}`;
}

/**
 * Read already labeled entries to avoid re-labeling
 */
async function loadLabeledEntries(): Promise<Set<string>> {
  const labeled = new Set<string>();
  
  if (!fs.existsSync(OUTPUT_FILE)) {
    return labeled;
  }

  const fileStream = fs.createReadStream(OUTPUT_FILE, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        const entry: TELabeledEntry = JSON.parse(line);
        labeled.add(getEntryKey(entry));
      } catch (err) {
        console.error('Error parsing labeled entry:', err);
      }
    }
  }

  return labeled;
}

/**
 * Read log entries from the input file
 */
async function* readLogEntries(): AsyncGenerator<HonestraLogEntry> {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Error: Input file not found: ${INPUT_FILE}`);
    console.error('Please ensure logs/honestra_log.jsonl exists before running this tool.');
    process.exit(1);
  }

  const fileStream = fs.createReadStream(INPUT_FILE, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        yield JSON.parse(line);
      } catch (err) {
        console.error('Error parsing log entry:', err);
      }
    }
  }
}

/**
 * Display an entry to the annotator
 */
function displayEntry(entry: HonestraLogEntry, index: number): void {
  console.log('\n' + '='.repeat(80));
  console.log(`Entry #${index}`);
  console.log('='.repeat(80));
  console.log('\n📝 USER MESSAGE:');
  console.log(entry.userMessage);
  console.log('\n🤖 MODEL REPLY:');
  console.log(entry.modelReply);
  
  // Show Honestra auto-detection as a hint
  console.log('\n🔍 Honestra (auto):');
  console.log(`  Has Teleology: ${entry.honestra.hasTeleology}`);
  console.log(`  Score: ${entry.honestra.teleologyScore}`);
  console.log(`  Severity: ${entry.honestra.severity}`);
  if (entry.honestra.reasons.length > 0) {
    console.log(`  Reasons:`);
    entry.honestra.reasons.forEach(r => console.log(`    - ${r}`));
  }
  console.log('');
}

/**
 * Prompt the user for input
 */
function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Get teleology level from user
 */
async function getTeleologyLevel(rl: readline.Interface): Promise<{ level?: 0 | 1 | 2; note?: string; skip?: boolean; quit?: boolean }> {
  while (true) {
    const answer = await prompt(rl, 'Teleology level? (0 = none, 1 = compression, 2 = fiction, s = skip, q = quit): ');
    
    if (answer === 'q') {
      return { quit: true };
    }
    if (answer === 's') {
      return { skip: true };
    }
    if (['0', '1', '2'].includes(answer)) {
      const note = await prompt(rl, 'Optional teleology note? (or just Enter to skip): ');
      return { 
        level: parseInt(answer) as 0 | 1 | 2,
        note: note || undefined
      };
    }
    console.log('Invalid input. Please enter 0, 1, 2, s, or q.');
  }
}

/**
 * Get adequacy level from user
 */
async function getAdequacyLevel(rl: readline.Interface): Promise<{ level?: 0 | 1 | 2; note?: string }> {
  while (true) {
    const answer = await prompt(rl, 'Adequacy level?  (0 = inadequate, 1 = partial, 2 = adequate): ');
    
    if (['0', '1', '2'].includes(answer)) {
      const note = await prompt(rl, 'Optional adequacy note? (or just Enter to skip): ');
      return { 
        level: parseInt(answer) as 0 | 1 | 2,
        note: note || undefined
      };
    }
    console.log('Invalid input. Please enter 0, 1, or 2.');
  }
}

/**
 * Append a labeled entry to the output file
 */
function writeLabeledEntry(entry: TELabeledEntry): void {
  // Ensure logs directory exists
  const logsDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.appendFileSync(OUTPUT_FILE, JSON.stringify(entry) + '\n', 'utf8');
}

// ============================================================================
// Main Function
// ============================================================================

async function main(): Promise<void> {
  console.log('🏷️  Honestra Log Labeling Tool for TE v0.2');
  console.log('==========================================\n');

  // Load already labeled entries
  console.log('Loading previously labeled entries...');
  const labeledKeys = await loadLabeledEntries();
  console.log(`Found ${labeledKeys.size} previously labeled entries.\n`);

  // Create readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let index = 0;
  let labeledCount = 0;
  let skippedCount = 0;

  try {
    for await (const entry of readLogEntries()) {
      index++;
      
      // Skip already labeled entries
      const entryKey = getEntryKey(entry);
      if (labeledKeys.has(entryKey)) {
        console.log(`Skipping entry #${index} (already labeled)`);
        continue;
      }

      // Display the entry
      displayEntry(entry, index);

      // Get teleology level
      const teleologyResult = await getTeleologyLevel(rl);
      
      if (teleologyResult.quit) {
        console.log('\n👋 Quitting gracefully...');
        break;
      }

      if (teleologyResult.skip) {
        const labeledEntry: TELabeledEntry = {
          ...entry,
          skip: true
        };
        writeLabeledEntry(labeledEntry);
        skippedCount++;
        console.log('Entry marked as skipped.\n');
        continue;
      }

      // Get adequacy level
      const adequacyResult = await getAdequacyLevel(rl);

      // Create labeled entry
      const labeledEntry: TELabeledEntry = {
        ...entry,
        teleology_level: teleologyResult.level,
        adequacy_level: adequacyResult.level
      };

      if (teleologyResult.note) {
        labeledEntry.teleology_note = teleologyResult.note;
      }
      if (adequacyResult.note) {
        labeledEntry.adequacy_note = adequacyResult.note;
      }

      // Write to output file
      writeLabeledEntry(labeledEntry);
      labeledCount++;
      console.log('✅ Entry labeled and saved.\n');
    }
  } finally {
    rl.close();
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Labeling Session Summary');
  console.log('='.repeat(80));
  console.log(`Total entries processed: ${index}`);
  console.log(`Newly labeled: ${labeledCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Output file: ${OUTPUT_FILE}`);
  console.log('\n✨ Done!\n');
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

