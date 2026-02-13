#!/usr/bin/env node
/**
 * Send HTML briefing email
 * Uses the beautiful HTML format instead of raw markdown
 */

const { generateEmail } = require('./generate-html-email');
const { sendEmail } = require('./scripts/send-briefings');
const fs = require('fs');
const path = require('path');

const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');

function loadSubscribers() {
  if (!fs.existsSync(SUBSCRIBERS_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
    return data.subscribers || data || [];
  } catch (e) {
    return [];
  }
}

async function sendHtmlBriefing(options = {}) {
  const { dryRun = false, to = null, verbose = false } = options;
  
  console.log('📧 Generating HTML briefing...\n');
  
  // Generate the HTML email
  const email = generateEmail();
  
  console.log(`Subject: ${email.subject}`);
  console.log(`Stats: ${email.stats.signals} signals, ${email.stats.momentum} momentum, ${email.stats.hiring} hiring, ${email.stats.news} news\n`);
  
  // Determine recipients
  let recipients = [];
  if (to) {
    recipients = [to];
    console.log(`Sending to: ${to}`);
  } else {
    recipients = loadSubscribers()
      .filter(s => s.status === 'active' || !s.status)
      .map(s => s.email || s);
    console.log(`Found ${recipients.length} subscriber(s)`);
  }
  
  if (recipients.length === 0) {
    console.log('No recipients found!');
    return { sent: 0, failed: 0 };
  }
  
  // Send to each recipient
  const results = { sent: 0, failed: 0, errors: [] };
  
  for (const recipient of recipients) {
    console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Sending to: ${recipient}`);
    
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

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Send HTML Briefing
==================
Usage: node send-html-briefing.js [options] [email]

Options:
  --dry-run    Show what would be sent without actually sending
  --verbose    Show detailed error information
  --preview    Just generate and output the HTML (no send)
  --help       Show this help

Examples:
  node send-html-briefing.js mitchelljbryson@gmail.com
  node send-html-briefing.js --dry-run
  node send-html-briefing.js --preview
`);
    process.exit(0);
  }
  
  if (args.includes('--preview')) {
    const email = generateEmail();
    console.log('\n=== SUBJECT ===');
    console.log(email.subject);
    console.log('\n=== HTML (saved to', email.outputFile, ') ===');
    console.log(email.html.slice(0, 500) + '...\n');
    process.exit(0);
  }
  
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  const emailArg = args.find(a => !a.startsWith('--') && a.includes('@'));
  
  sendHtmlBriefing({ dryRun, verbose, to: emailArg })
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Fatal error:', err.message);
      process.exit(1);
    });
}

module.exports = { sendHtmlBriefing };
