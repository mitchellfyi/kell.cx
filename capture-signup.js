#!/usr/bin/env node
/**
 * Capture waitlist signups
 * Can be called as webhook endpoint or manually
 * 
 * Usage: node capture-signup.js "email@example.com"
 */

const fs = require('fs');
const path = require('path');

const WAITLIST_FILE = path.join(__dirname, 'waitlist.json');

function addSignup(email) {
  if (!email || !email.includes('@')) {
    console.error('Invalid email');
    return false;
  }
  
  let signups = [];
  try {
    signups = JSON.parse(fs.readFileSync(WAITLIST_FILE, 'utf8'));
  } catch (e) {
    // File doesn't exist or is invalid
  }
  
  // Check for duplicates
  if (signups.some(s => s.email.toLowerCase() === email.toLowerCase())) {
    console.log(`Email already on waitlist: ${email}`);
    return true;
  }
  
  signups.push({
    email: email.toLowerCase().trim(),
    timestamp: new Date().toISOString(),
    source: 'website'
  });
  
  fs.writeFileSync(WAITLIST_FILE, JSON.stringify(signups, null, 2));
  console.log(`✓ Added to waitlist: ${email}`);
  console.log(`  Total signups: ${signups.length}`);
  
  return true;
}

// CLI usage
if (require.main === module) {
  const email = process.argv[2];
  if (email) {
    addSignup(email);
  } else {
    // Show current signups
    try {
      const signups = JSON.parse(fs.readFileSync(WAITLIST_FILE, 'utf8'));
      console.log(`Waitlist (${signups.length} signups):`);
      signups.forEach(s => console.log(`  - ${s.email} (${s.timestamp})`));
    } catch (e) {
      console.log('No signups yet');
    }
  }
}

module.exports = { addSignup };
