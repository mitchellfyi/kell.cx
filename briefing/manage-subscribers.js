#!/usr/bin/env node
/**
 * Subscriber Management for Briefing
 * 
 * Usage:
 *   node manage-subscribers.js add <email>
 *   node manage-subscribers.js list
 *   node manage-subscribers.js remove <email>
 *   node manage-subscribers.js send-test <email>
 *   node manage-subscribers.js send-all
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');
const EMAIL_SERVICE = path.join(__dirname, '..', '..', 'services', 'email');

function loadSubscribers() {
  if (!fs.existsSync(SUBSCRIBERS_FILE)) {
    return { subscribers: [], meta: { created: new Date().toISOString().split('T')[0] } };
  }
  return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
}

function saveSubscribers(data) {
  data.meta.lastUpdated = new Date().toISOString().split('T')[0];
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(data, null, 2));
}

function addSubscriber(email) {
  const data = loadSubscribers();
  
  // Check if already exists
  if (data.subscribers.find(s => s.email.toLowerCase() === email.toLowerCase())) {
    console.log(`Already subscribed: ${email}`);
    return false;
  }
  
  data.subscribers.push({
    email: email.toLowerCase(),
    addedAt: new Date().toISOString(),
    source: 'manual'
  });
  
  saveSubscribers(data);
  console.log(`Added: ${email}`);
  console.log(`Total subscribers: ${data.subscribers.length}`);
  return true;
}

function listSubscribers() {
  const data = loadSubscribers();
  console.log(`\nSubscribers (${data.subscribers.length}):\n`);
  
  if (data.subscribers.length === 0) {
    console.log('  (none yet)');
    return;
  }
  
  data.subscribers.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.email} (added ${s.addedAt.split('T')[0]})`);
  });
}

function removeSubscriber(email) {
  const data = loadSubscribers();
  const before = data.subscribers.length;
  data.subscribers = data.subscribers.filter(s => s.email.toLowerCase() !== email.toLowerCase());
  
  if (data.subscribers.length === before) {
    console.log(`Not found: ${email}`);
    return false;
  }
  
  saveSubscribers(data);
  console.log(`Removed: ${email}`);
  return true;
}

async function sendEmail(to, subject, body) {
  try {
    const cmd = `cd ${EMAIL_SERVICE} && source .env && node send.js "${to}" "${subject}" "${body.replace(/"/g, '\\"')}"`;
    execSync(cmd, { stdio: 'inherit', shell: '/bin/bash' });
    return true;
  } catch (err) {
    console.error(`Failed to send to ${to}:`, err.message);
    return false;
  }
}

async function sendTestBriefing(email) {
  const subject = '⚡ Test Briefing from Kell';
  const body = `Hi!

This is a test email from Kell's Briefing service.

If you received this, your subscription is working. You'll start receiving daily competitive intelligence briefings soon.

— Kell
https://kell.cx`;

  console.log(`Sending test to ${email}...`);
  await sendEmail(email, subject, body);
}

async function sendToAll() {
  const data = loadSubscribers();
  
  if (data.subscribers.length === 0) {
    console.log('No subscribers yet.');
    return;
  }
  
  // Check for today's briefing
  const today = new Date().toISOString().split('T')[0];
  const briefingPath = path.join(__dirname, 'digests', `briefing-${today}.md`);
  
  if (!fs.existsSync(briefingPath)) {
    console.log(`No briefing found for today (${today}). Run daily-briefing.js first.`);
    return;
  }
  
  const briefingContent = fs.readFileSync(briefingPath, 'utf8');
  const subject = `⚡ Daily Intel: ${today}`;
  
  console.log(`Sending to ${data.subscribers.length} subscribers...`);
  
  for (const sub of data.subscribers) {
    console.log(`  → ${sub.email}`);
    await sendEmail(sub.email, subject, briefingContent);
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('Done!');
}

// CLI
const [,, action, ...args] = process.argv;

switch (action) {
  case 'add':
    if (!args[0]) {
      console.log('Usage: node manage-subscribers.js add <email>');
      process.exit(1);
    }
    addSubscriber(args[0]);
    break;
    
  case 'list':
    listSubscribers();
    break;
    
  case 'remove':
    if (!args[0]) {
      console.log('Usage: node manage-subscribers.js remove <email>');
      process.exit(1);
    }
    removeSubscriber(args[0]);
    break;
    
  case 'send-test':
    if (!args[0]) {
      console.log('Usage: node manage-subscribers.js send-test <email>');
      process.exit(1);
    }
    sendTestBriefing(args[0]);
    break;
    
  case 'send-all':
    sendToAll();
    break;
    
  default:
    console.log(`
Subscriber Management for Briefing

Usage:
  node manage-subscribers.js add <email>      Add a subscriber
  node manage-subscribers.js list             List all subscribers
  node manage-subscribers.js remove <email>   Remove a subscriber
  node manage-subscribers.js send-test <email> Send test email
  node manage-subscribers.js send-all         Send today's briefing to all
`);
}
