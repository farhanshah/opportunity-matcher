#!/usr/bin/env node
// Fail CI on known credential formats in tracked files without printing secret values.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0').filter(Boolean);
const patterns = [
  ['OpenAI API key', /\bsk-(?:proj-)?[a-zA-Z0-9_-]{24,}\b/g],
  ['Resend API key', /\bre_[a-zA-Z0-9]{24,}\b/g],
  ['GitHub access token', /\bgh[pousr]_[a-zA-Z0-9_]{30,}\b/g],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['Slack token', /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g],
  ['Private key material', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['Database credentials in URL', /postgres(?:ql)?:\/\/[^\s:/@]+:[^\s/@]+@[^\s/'"`]+/gi],
];
let failures=0;
for(const path of files) {
  if (path === '.env.example') continue;
  if (/(^|\/)\.env(?:\..+)?$/.test(path)) {
    console.error('BLOCKED tracked environment file: '+path);
    failures++; continue;
  }
  if (statSync(path).size > 1_000_000) continue;
  let source;
  try { source=readFileSync(path,'utf8') } catch { continue }
  if(source.includes('\0')) continue;
  for(const [label,pattern] of patterns) {
    pattern.lastIndex=0;
    if(pattern.test(source)) {
      console.error('Potential '+label+' in '+path+' (value withheld)');
      failures++;
    }
  }
}
if(failures) {
  console.error('Security scan failed: '+failures+' finding(s). Review and rotate any real exposed credentials.');
  process.exitCode=1;
} else console.log('Tracked-file credential checks passed ('+files.length+' paths). Historical commits and hosted secrets still need separate review.');
