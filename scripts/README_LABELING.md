# Honestra Log Labeling Tool

This tool provides an interactive interface for annotating Honestra log entries with teleology and adequacy levels for building TE v0.2 training data.

## Overview

The labeling tool helps human annotators assign two dimensions to each model response:

### Teleology Level (0-2)

- **0 = No teleology / neutral**: Purely causal or descriptive language
- **1 = Teleology-as-compression**: Human-purpose language that is grounded and harmless
- **2 = Teleology-as-fiction**: Anthropomorphism, fate, punishment by system/universe

### Adequacy Level (0-2)

- **0 = Inadequate**: Confabulatory, wrong cause, magical thinking presented as fact
- **1 = Partially adequate**: Roughly on the right track, but mixed/vague/incomplete
- **2 = Adequate**: Causal, grounded in mechanism/policy/data, no invented agency

## Usage

### Installation

First, install dependencies:

```bash
cd Honestra
npm install
```

### Running the Tool

```bash
npm run honestra:label
```

### Interactive Labeling Process

For each log entry, the tool will display:

1. Entry number
2. User's message
3. Model's reply
4. Honestra's automatic detection (as a hint)

You'll be prompted to provide:

```
Teleology level? (0 = none, 1 = compression, 2 = fiction, s = skip, q = quit):
```

Available commands:
- `0`, `1`, `2`: Assign the corresponding level
- `s`: Skip this entry (marks it as skipped but keeps it in the output)
- `q`: Quit and save all labels collected so far

After entering a teleology level, you can optionally add a note, then proceed to adequacy:

```
Adequacy level? (0 = inadequate, 1 = partial, 2 = adequate):
```

## Input/Output Files

- **Input**: `logs/honestra_log.jsonl` - Original Honestra logs
- **Output**: `logs/honestra_labeled.jsonl` - Labeled entries with your annotations

## Features

- **Resume capability**: The tool automatically skips entries that have already been labeled
- **Skip entries**: Mark entries for later review without labeling them
- **Graceful exit**: Press `q` to quit at any time; all labels are saved immediately
- **Optional notes**: Add contextual notes to explain your labeling decisions
- **Streaming**: Processes large log files efficiently without loading everything into memory

## Output Format

Each labeled entry includes the original log data plus:

```typescript
{
  // ... original log fields ...
  teleology_level?: 0 | 1 | 2,
  adequacy_level?: 0 | 1 | 2,
  teleology_note?: string,
  adequacy_note?: string,
  skip?: boolean
}
```

## Example Session

```
🏷️  Honestra Log Labeling Tool for TE v0.2
==========================================

Loading previously labeled entries...
Found 0 previously labeled entries.

================================================================================
Entry #1
================================================================================

📝 USER MESSAGE:
Why did my application crash?

🤖 MODEL REPLY:
Your application crashed because it wanted to protect itself from further harm.

🔍 Honestra (auto):
  Has Teleology: true
  Score: 0.85
  Severity: high
  Reasons:
    - Anthropomorphic attribution

Teleology level? (0 = none, 1 = compression, 2 = fiction, s = skip, q = quit): 2
Optional teleology note? (or just Enter to skip): Strong anthropomorphism
Adequacy level?  (0 = inadequate, 1 = partial, 2 = adequate): 0
Optional adequacy note? (or just Enter to skip): 
✅ Entry labeled and saved.
```

## Tips for Annotators

1. **Use Honestra hints carefully**: The automatic detection is helpful but not always accurate
2. **Think about context**: Consider what the user asked and whether the response is helpful despite teleological language
3. **Skip when unsure**: It's better to skip an entry than to label it incorrectly
4. **Add notes**: When your decision isn't obvious, add a note to help future reviewers
5. **Take breaks**: Labeling can be mentally taxing; the tool saves after each entry

## Troubleshooting

### "Input file not found" error

Make sure `logs/honestra_log.jsonl` exists before running the tool. The log file should contain one JSON object per line.

### Tool won't start

Ensure you've installed dependencies with `npm install` in the Honestra directory.

### Want to restart labeling

To restart from scratch, delete or rename `logs/honestra_labeled.jsonl`.

## Development

The tool is implemented in TypeScript and can be found at `scripts/labelHonestraLogs.ts`.

