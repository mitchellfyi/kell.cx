#!/usr/bin/env node
// Send daily briefings to all active subscribers

const SUBSCRIBER_API = 'https://email-api.kell.cx';
const SUBSCRIBER_TOKEN = 'kell-email-api-secret-2026';
const RESEND_API_KEY = 're_abKgjcKU_C6v6AeLrQ53e3HWabPQGSfqW';

async function subscriberApi(path, options = {}) {
  const res = await fetch(`${SUBSCRIBER_API}${path}`, {
    ...options,
    headers: {
      'X-Auth-Token': SUBSCRIBER_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  return res.json();
}

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

async function sendBriefings(briefingContent, options = {}) {
  const { dryRun = false, filterEmail = null } = options;
  
  console.log('Fetching subscriber list...\n');
  
  const subscribers = await subscriberApi('/subscribers');
  const activeSubscribers = subscribers.filter(s => s.status === 'active');
  
  if (filterEmail) {
    const filtered = activeSubscribers.filter(s => s.email === filterEmail);
    console.log(`Filtered to: ${filtered.length} subscriber(s)`);
    return sendToList(filtered, briefingContent, dryRun);
  }
  
  console.log(`Found ${activeSubscribers.length} active subscriber(s)\n`);
  return sendToList(activeSubscribers, briefingContent, dryRun);
}

async function sendToList(subscribers, content, dryRun) {
  const { subject, html, text } = content;
  const results = { sent: 0, failed: 0, errors: [] };
  
  for (const subscriber of subscribers) {
    console.log(`${dryRun ? '[DRY RUN] ' : ''}Sending to: ${subscriber.email}`);
    
    if (dryRun) {
      results.sent++;
      continue;
    }
    
    try {
      const result = await sendEmail(subscriber.email, subject, html, text);
      
      if (result.id) {
        console.log(`  ✓ Sent (${result.id})`);
        results.sent++;
      } else {
        console.log(`  ✗ Failed: ${result.message || 'Unknown error'}`);
        results.failed++;
        results.errors.push({ email: subscriber.email, error: result.message });
      }
      
      // Rate limit: small delay between sends
      await new Promise(r => setTimeout(r, 100));
      
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      results.failed++;
      results.errors.push({ email: subscriber.email, error: err.message });
    }
  }
  
  console.log(`\nResults: ${results.sent} sent, ${results.failed} failed`);
  return results;
}

// Export for use by daily-briefing.js
module.exports = { sendBriefings, sendEmail };

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Usage: node send-briefings.js [options]

Options:
  --dry-run     Don't actually send, just show what would happen
  --test        Send test briefing to verify setup
  --help        Show this help

Normally called by daily-briefing.js with generated content.
`);
    process.exit(0);
  }
  
  if (args.includes('--test')) {
    const testContent = {
      subject: 'Test Briefing - ' + new Date().toLocaleDateString(),
      html: `<h1>Test Briefing</h1><p>This is a test of the Kell briefing system.</p><p>Time: ${new Date().toISOString()}</p>`,
      text: `Test Briefing\n\nThis is a test of the Kell briefing system.\nTime: ${new Date().toISOString()}`
    };
    
    sendBriefings(testContent, { dryRun: args.includes('--dry-run') })
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  } else {
    console.log('No content provided. Use --test to send a test briefing or call from daily-briefing.js');
  }
}
