#!/usr/bin/env node
// Process new signups from FormSubmit emails and add to subscriber list

const API_URL = 'https://email-api.kell.cx';
const API_TOKEN = 'kell-email-api-secret-2026';

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'X-Auth-Token': API_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  return res.json();
}

function extractEmailFromRaw(raw) {
  // Try Reply-To header first (FormSubmit puts submitter email here)
  const replyTo = raw.match(/Reply-To:\s*([^\s<>]+@[^\s<>\r\n]+)/i);
  if (replyTo) return replyTo[1].toLowerCase().trim();
  
  // Try HTML table value (looking for email field)
  // Format in quoted-printable: </td>=\n        <td>email@example.com</td>
  const tableMatch = raw.match(/<\/th>\s*[\r\n\s=]*<\/tr>\s*[\r\n\s=]*<tr>\s*[\r\n\s=]*<td[^>]*>\s*[\r\n\s=]*email\s*[\r\n\s=]*<\/td>\s*[\r\n\s=]*<td[^>]*>\s*[\r\n\s=]*([^\s<>]+@[^\s<>\r\n]+)/i);
  if (tableMatch) return tableMatch[1].toLowerCase().trim();
  
  // Try simpler pattern
  const simpleMatch = raw.match(/>\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*</);
  if (simpleMatch) return simpleMatch[1].toLowerCase().trim();
  
  return null;
}

async function processSignups() {
  console.log('Checking for new signups...\n');
  
  // Get inbox for hi@kell.cx
  const inbox = await api('/inbox?to=hi%40kell.cx');
  
  // Filter FormSubmit signup notifications
  const signups = inbox.filter(email => 
    email.from.includes('formsubmit') && 
    email.subject.toLowerCase().includes('signup')
  );
  
  if (signups.length === 0) {
    console.log('No new signup emails found.');
    return;
  }
  
  console.log(`Found ${signups.length} signup email(s)\n`);
  
  // Get current subscribers to check for duplicates
  const subscribers = await api('/subscribers');
  const existingEmails = new Set(subscribers.map(s => s.email.toLowerCase()));
  
  // Track processed email IDs to avoid re-processing
  let processedIds = [];
  try {
    const stored = await api('/inbox?to=processed-signups');
    if (Array.isArray(stored)) processedIds = stored.map(s => s.id);
  } catch {}
  const processedSet = new Set(processedIds);
  
  for (const signup of signups) {
    if (processedSet.has(signup.id)) {
      console.log(`Skipping already processed: ${signup.id}`);
      continue;
    }
    
    console.log(`Processing: ${signup.subject} (${signup.id})`);
    
    // Get full email
    const email = await api(`/email/${signup.id}`);
    
    // Extract subscriber email
    const subscriberEmail = extractEmailFromRaw(email.raw);
    
    if (!subscriberEmail) {
      console.log('  Could not extract email address');
      continue;
    }
    
    console.log(`  Email: ${subscriberEmail}`);
    
    if (existingEmails.has(subscriberEmail)) {
      console.log('  Already subscribed, skipping');
      continue;
    }
    
    // Add subscriber
    const result = await api('/subscribers', {
      method: 'POST',
      body: JSON.stringify({
        email: subscriberEmail,
        source: 'kell.cx form'
      })
    });
    
    if (result.success) {
      console.log(`  ✓ Added subscriber: ${subscriberEmail}`);
      existingEmails.add(subscriberEmail);
    } else {
      console.log(`  ✗ Failed: ${result.error}`);
    }
  }
  
  // Final stats
  const stats = await api('/stats');
  console.log(`\nTotal subscribers: ${stats.subscribers.active} active`);
}

processSignups().catch(console.error);
