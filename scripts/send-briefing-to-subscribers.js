#!/usr/bin/env node
/**
 * Send HTML briefing to all kell.cx waitlist subscribers
 * Uses the briefing project's HTML generator
 */

const fs = require('fs');
const path = require('path');

// Paths
const WAITLIST_FILE = path.join(__dirname, '..', 'waitlist.json');
const BRIEFING_PROJECT = path.join(__dirname, '..', 'briefing');

// Resend API config
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_abKgjcKU_C6v6AeLrQ53e3HWabPQGSfqW';

async function sendEmail(to, subject, html, text) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Kell Briefing <briefings@kell.cx>',
      to,
      subject,
      html,
      text
    })
  });
  return res.json();
}

function loadWaitlist() {
  if (!fs.existsSync(WAITLIST_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(WAITLIST_FILE, 'utf8'));
  } catch (e) {
    console.error('Error loading waitlist:', e.message);
    return [];
  }
}

async function sendBriefingToSubscribers(options = {}) {
  const { dryRun = false, verbose = false } = options;
  
  console.log('📧 Generating HTML briefing...\n');
  
  // Import and run the HTML generator from briefing project
  const { generateEmail } = require(path.join(BRIEFING_PROJECT, 'generate-html-email.js'));
  const email = generateEmail();
  
  console.log(`Subject: ${email.subject}`);
  console.log(`Stats: ${email.stats.signals} signals, ${email.stats.momentum} momentum, ${email.stats.hiring} hiring, ${email.stats.news} news\n`);
  
  // Load waitlist subscribers
  const subscribers = loadWaitlist();
  console.log(`Found ${subscribers.length} subscriber(s) in waitlist\n`);
  
  if (subscribers.length === 0) {
    console.log('No subscribers to send to.');
    return { sent: 0, failed: 0 };
  }
  
  // Send to each subscriber
  const results = { sent: 0, failed: 0, errors: [] };
  
  for (const sub of subscribers) {
    const recipient = sub.email || sub;
    console.log(`${dryRun ? '[DRY RUN] ' : ''}Sending to: ${recipient}`);
    
    if (dryRun) {
      results.sent++;
      continue;
    }
    
    try {
      const result = await sendEmail(recipient, email.subject, email.html, email.text);
      
      if (result && result.id) {
        console.log(`  ✅ Sent (${result.id})`);
        results.sent++;
      } else {
        const errorMsg = result?.message || result?.error || 'Unknown error';
        console.log(`  ❌ Failed: ${errorMsg}`);
        results.failed++;
        results.errors.push({ email: recipient, error: errorMsg });
      }
      
      // Small delay between sends
      await new Promise(r => setTimeout(r, 150));
      
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      results.failed++;
      results.errors.push({ email: recipient, error: err.message });
    }
  }
  
  console.log(`\n📊 Results: ${results.sent} sent, ${results.failed} failed`);
  
  if (verbose && results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => console.log(`  - ${e.email}: ${e.error}`));
  }
  
  return results;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Send Briefing to kell.cx Subscribers
====================================
Usage: node send-briefing-to-subscribers.js [options]

Options:
  --dry-run    Show what would be sent without sending
  --verbose    Show detailed errors
  --help       Show this help
`);
    process.exit(0);
  }
  
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  
  sendBriefingToSubscribers({ dryRun, verbose })
    .then(results => process.exit(results.failed > 0 ? 1 : 0))
    .catch(err => {
      console.error('Fatal error:', err.message);
      process.exit(1);
    });
}

module.exports = { sendBriefingToSubscribers };
