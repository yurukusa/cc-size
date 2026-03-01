#!/usr/bin/env node
/**
 * cc-size — How much conversation history have you accumulated?
 * Shows total disk usage and growth rate of your Claude Code sessions.
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const showHelp = args.includes('--help') || args.includes('-h');
const includeSubagents = args.includes('--all'); // include subagent files

if (showHelp) {
  console.log(`cc-size — How much conversation history have you accumulated?

Usage:
  npx cc-size              # Total history size and growth
  npx cc-size --all        # Include subagent session files
  npx cc-size --json       # JSON output
`);
  process.exit(0);
}

const claudeDir = join(homedir(), '.claude', 'projects');

function humanSize(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function getISOMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Convert project directory name to human-readable project label.
 * "-home-namakusa-projects-cc-loop" -> "projects-cc-loop"
 * "-home-namakusa" -> "~/ (home)"
 */
function projectName(dirName) {
  // Remove leading "-home-[username]" prefix (with or without trailing dash)
  const stripped = dirName.replace(/^-home-[^-]+/, '').replace(/^-/, '');
  if (!stripped) return '~/ (home)';
  return stripped;
}

const byProject = {};
const byMonth = {};
let totalFiles = 0;
let totalBytes = 0;
let oldestDate = null;
let newestDate = null;
let largestFile = { size: 0, path: '' };

let projectDirs;
try {
  projectDirs = readdirSync(claudeDir);
} catch {
  console.error(`Cannot read ${claudeDir}`);
  process.exit(1);
}

for (const projDir of projectDirs) {
  const projPath = join(claudeDir, projDir);
  let stat;
  try {
    stat = statSync(projPath);
    if (!stat.isDirectory()) continue;
  } catch {
    continue;
  }

  let entries;
  try {
    entries = readdirSync(projPath);
  } catch {
    continue;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.jsonl')) continue;
    if (!includeSubagents && projPath.includes('/subagents/')) continue;

    const filePath = join(projPath, entry);
    let fstat;
    try {
      fstat = statSync(filePath);
      if (!fstat.isFile()) continue;
    } catch {
      continue;
    }

    const size = fstat.size;
    const mtime = new Date(fstat.mtime);
    const month = getISOMonth(mtime);

    totalFiles++;
    totalBytes += size;

    // By project
    if (!byProject[projDir]) byProject[projDir] = { bytes: 0, files: 0, name: projectName(projDir) };
    byProject[projDir].bytes += size;
    byProject[projDir].files++;

    // By month
    byMonth[month] = (byMonth[month] || 0) + size;

    // Tracking
    if (!oldestDate || mtime < oldestDate) oldestDate = mtime;
    if (!newestDate || mtime > newestDate) newestDate = mtime;
    if (size > largestFile.size) largestFile = { size, path: filePath.replace(homedir(), '~') };
  }
}

if (totalFiles === 0) {
  console.error('No session files found.');
  process.exit(1);
}

// Calculate growth rate from last 30 days
const now = new Date();
const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
let last30DaysBytes = 0;
for (const [month, bytes] of Object.entries(byMonth)) {
  const [yr, mo] = month.split('-').map(Number);
  const monthStart = new Date(yr, mo - 1, 1);
  if (monthStart >= thirtyDaysAgo) last30DaysBytes += bytes;
}
const dailyGrowth = last30DaysBytes / 30;

// Sorted projects by size
const sortedProjects = Object.entries(byProject).sort((a, b) => b[1].bytes - a[1].bytes);
const sortedMonths = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));

if (jsonMode) {
  console.log(JSON.stringify({
    total_bytes: totalBytes,
    total_size: humanSize(totalBytes),
    total_files: totalFiles,
    daily_growth_bytes: Math.round(dailyGrowth),
    daily_growth: humanSize(dailyGrowth),
    oldest_session: oldestDate?.toISOString().slice(0, 10),
    newest_session: newestDate?.toISOString().slice(0, 10),
    largest_file: { path: largestFile.path, size: humanSize(largestFile.size) },
    by_month: Object.fromEntries(sortedMonths.map(([m, b]) => [m, humanSize(b)])),
    by_project: sortedProjects.slice(0, 10).map(([dir, d]) => ({
      project: d.name,
      size: humanSize(d.bytes),
      files: d.files,
    })),
  }, null, 2));
  process.exit(0);
}

// Display
const BAR_WIDTH = 24;
const maxMonthBytes = Math.max(...Object.values(byMonth));
const maxProjBytes = sortedProjects[0]?.[1].bytes || 1;

function bar(bytes, max) {
  const filled = Math.round((bytes / max) * BAR_WIDTH);
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
}

function rpad(str, len) {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

console.log('cc-size — Your Claude Code conversation history\n');

// Stats header
console.log(`  Total size:    ${humanSize(totalBytes)}`);
console.log(`  Total files:   ${totalFiles.toLocaleString()} sessions`);
console.log(`  Date range:    ${oldestDate?.toISOString().slice(0, 10)} → ${newestDate?.toISOString().slice(0, 10)}`);
console.log(`  Daily growth:  ~${humanSize(dailyGrowth)}/day (last 30 days)`);
console.log(`  Largest file:  ${humanSize(largestFile.size)}`);

// Growth projection
if (dailyGrowth > 0) {
  const daysTo10GB = (10 * 1024 * 1024 * 1024 - totalBytes) / dailyGrowth;
  if (daysTo10GB > 0 && daysTo10GB < 3650) {
    const projDate = new Date(now.getTime() + daysTo10GB * 86400000);
    console.log(`  At this rate:  10 GB by ~${projDate.toISOString().slice(0, 7)}`);
  }
}

console.log('\n' + '─'.repeat(54));
console.log('  Monthly growth\n');

for (const [month, bytes] of sortedMonths.slice(-12)) {
  const current = month === getISOMonth(now);
  const tag = current ? ' (in progress)' : '';
  const sizeStr = humanSize(bytes).padStart(8);
  console.log(`  ${month}  ${bar(bytes, maxMonthBytes)}  ${sizeStr}${tag}`);
}

console.log('\n' + '─'.repeat(54));
console.log('  By project (top 8)\n');

const maxProjLabel = Math.max(...sortedProjects.slice(0, 8).map(([, d]) => d.name.length));

for (const [, data] of sortedProjects.slice(0, 8)) {
  const label = rpad(data.name, maxProjLabel);
  const sizeStr = humanSize(data.bytes).padStart(8);
  console.log(`  ${label}  ${bar(data.bytes, maxProjBytes)}  ${sizeStr}`);
}
