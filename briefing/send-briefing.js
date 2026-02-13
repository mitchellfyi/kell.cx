#!/usr/bin/env node
/**
 * Send the latest briefing via email
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIGEST_DIR = path.join(__dirname, 'digests');
const EMAIL_SERVICE = '/home/clawdbot/clawd/services/email/send.js';

function getLatestBriefing() {
  const files = fs.readdirSync(DIGEST_DIR)
    .filter(f => f.startsWith('briefing-') && f.endsWith('.md'))
    .sort()
    .reverse();
  
  if (files.length === 0) return null;
  return {
    path: path.join(DIGEST_DIR, files[0]),
    content: fs.readFileSync(path.join(DIGEST_DIR, files[0]), 'utf-8')
  };
}

async function sendBriefing(to) {
  const briefing = getLatestBriefing();
  if (!briefing) {
    console.error('No briefing found');
    process.exit(1);
  }

  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const subject = `Competitive Briefing - ${date}`;
  
  console.log(`Sending to ${to}...`);
  console.log(`Subject: ${subject}`);
  
  // Use the email service
  const cmd = `node "${EMAIL_SERVICE}" "${to}" "${subject}" "${briefing.content.replace(/"/g, '\\"')}"`;
  
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log('✅ Sent!');
  } catch (e) {
    console.error('Failed to send:', e.message);
  }
}

const recipient = process.argv[2] || 'mitchelljbryson@gmail.com';
sendBriefing(recipient);
