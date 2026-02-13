#!/usr/bin/env node
/**
 * Discord Community Monitor
 * Tracks announcement channels in competitor Discord servers
 * Uses public Discord widgets (no auth required for servers with widgets enabled)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Competitor Discord servers with public widget access
// Note: Only works for servers with widget enabled
const DISCORD_SERVERS = {
  cursor: {
    name: 'Cursor',
    inviteCode: 'cursor', // discord.gg/cursor
    serverId: '1119885301872070706', // Cursor's server ID
  },
  continue: {
    name: 'Continue.dev',
    inviteCode: 'EfJEfdFnqN',
    serverId: '1108621136150011905',
  },
  replit: {
    name: 'Replit',
    inviteCode: 'replit',
    serverId: '437048931827056642',
  },
  codeium: {
    name: 'Codeium/Windsurf',
    inviteCode: 'codeium',
    serverId: '1027685395649015980',
  },
  tabnine: {
    name: 'Tabnine',
    inviteCode: 'tabnine',
    serverId: '808677477167046676',
  },
  sourcegraph: {
    name: 'Sourcegraph',
    inviteCode: 'sourcegraph',
    serverId: '969688426372825169',
  },
};

// Keywords that indicate important announcements
const ANNOUNCEMENT_KEYWORDS = [
  'release', 'update', 'launch', 'new feature', 'announcing', 'introducing',
  'now available', 'shipping', 'deployed', 'v1', 'v2', 'version', 'beta',
  'pricing', 'free', 'enterprise', 'pro', 'changelog', 'breaking change',
  'partnership', 'integration', 'acquisition', 'funding', 'hiring'
];

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BriefingBot/1.0)',
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ ok: true, json: () => JSON.parse(data), text: () => data, status: res.statusCode });
          } catch {
            resolve({ ok: true, text: () => data, status: res.statusCode });
          }
        } else {
          resolve({ ok: false, status: res.statusCode, text: () => data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function getServerWidget(serverId) {
  try {
    const url = `https://discord.com/api/guilds/${serverId}/widget.json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return { error: `Widget not accessible (${response.status})` };
    }
    
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function getInviteInfo(inviteCode) {
  try {
    // Get invite metadata (works without auth)
    const url = `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true&with_expiration=true`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return { error: `Invite not accessible (${response.status})` };
    }
    
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function scrapeDiscordCommunities() {
  const results = {
    timestamp: new Date().toISOString(),
    servers: {},
    changes: [],
    summary: []
  };

  // Load previous data for comparison
  const dataDir = path.join(__dirname, 'data', 'discord');
  const historyFile = path.join(dataDir, 'history.json');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  let previousData = {};
  if (fs.existsSync(historyFile)) {
    try {
      previousData = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    } catch {}
  }

  for (const [key, server] of Object.entries(DISCORD_SERVERS)) {
    console.log(`Checking ${server.name} Discord...`);
    
    const serverData = {
      name: server.name,
      inviteCode: server.inviteCode,
      serverId: server.serverId,
      checked: new Date().toISOString()
    };

    // Get invite info (member counts)
    const inviteInfo = await getInviteInfo(server.inviteCode);
    if (!inviteInfo.error) {
      serverData.memberCount = inviteInfo.approximate_member_count;
      serverData.onlineCount = inviteInfo.approximate_presence_count;
      serverData.guildName = inviteInfo.guild?.name;
      serverData.guildDescription = inviteInfo.guild?.description;
      serverData.guildIcon = inviteInfo.guild?.icon 
        ? `https://cdn.discordapp.com/icons/${inviteInfo.guild.id}/${inviteInfo.guild.icon}.png`
        : null;
      serverData.features = inviteInfo.guild?.features || [];
      
      // Check for changes
      const prev = previousData.servers?.[key];
      if (prev) {
        const memberChange = serverData.memberCount - (prev.memberCount || 0);
        const changePercent = prev.memberCount 
          ? ((memberChange / prev.memberCount) * 100).toFixed(1)
          : 0;
        
        serverData.memberChange = memberChange;
        serverData.memberChangePercent = parseFloat(changePercent);
        
        // Significant growth (>5% in one check)
        if (serverData.memberChangePercent > 5) {
          results.changes.push({
            type: 'member_surge',
            server: server.name,
            change: memberChange,
            percent: serverData.memberChangePercent,
            message: `${server.name} Discord grew by ${memberChange.toLocaleString()} members (${changePercent}%)`
          });
        }
        
        // Description change (often indicates announcements)
        if (prev.guildDescription !== serverData.guildDescription && serverData.guildDescription) {
          results.changes.push({
            type: 'description_change',
            server: server.name,
            old: prev.guildDescription,
            new: serverData.guildDescription,
            message: `${server.name} updated Discord description`
          });
        }
      }
    } else {
      serverData.error = inviteInfo.error;
    }

    // Get widget info (online members, channels if exposed)
    const widgetInfo = await getServerWidget(server.serverId);
    if (!widgetInfo.error) {
      serverData.widgetEnabled = true;
      serverData.widgetOnline = widgetInfo.presence_count;
      serverData.instantInvite = widgetInfo.instant_invite;
      // Some servers expose channel list
      if (widgetInfo.channels?.length > 0) {
        serverData.publicChannels = widgetInfo.channels.map(c => ({
          id: c.id,
          name: c.name,
          position: c.position
        }));
      }
    } else {
      serverData.widgetEnabled = false;
    }

    results.servers[key] = serverData;

    // Generate summary line
    if (serverData.memberCount) {
      const changeStr = serverData.memberChange 
        ? ` (${serverData.memberChange >= 0 ? '+' : ''}${serverData.memberChange.toLocaleString()})`
        : '';
      results.summary.push(
        `${server.name}: ${serverData.memberCount.toLocaleString()} members${changeStr}, ${serverData.onlineCount?.toLocaleString() || '?'} online`
      );
    } else {
      results.summary.push(`${server.name}: Unable to fetch data`);
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }

  // Save current data
  fs.writeFileSync(historyFile, JSON.stringify(results, null, 2));
  
  // Save latest snapshot
  const latestFile = path.join(dataDir, 'latest.json');
  fs.writeFileSync(latestFile, JSON.stringify(results, null, 2));

  return results;
}

function formatDiscordSection(data) {
  if (!data || !data.servers) return '';

  let output = '\n## 🎮 Discord Community Pulse\n\n';
  
  // Summary table
  output += '| Community | Members | Online | Growth |\n';
  output += '|-----------|---------|--------|--------|\n';
  
  const sorted = Object.entries(data.servers)
    .filter(([_, s]) => s.memberCount)
    .sort((a, b) => (b[1].memberCount || 0) - (a[1].memberCount || 0));
  
  for (const [key, server] of sorted) {
    const members = server.memberCount?.toLocaleString() || 'N/A';
    const online = server.onlineCount?.toLocaleString() || 'N/A';
    const growth = server.memberChange 
      ? `${server.memberChange >= 0 ? '+' : ''}${server.memberChange.toLocaleString()} (${server.memberChangePercent}%)`
      : 'New';
    
    output += `| ${server.name} | ${members} | ${online} | ${growth} |\n`;
  }
  
  // Notable changes
  if (data.changes?.length > 0) {
    output += '\n### Notable Changes\n';
    for (const change of data.changes) {
      output += `- **${change.server}**: ${change.message}\n`;
    }
  }

  // Engagement ratio (online/total) as health metric
  output += '\n### Community Engagement\n';
  for (const [key, server] of sorted) {
    if (server.memberCount && server.onlineCount) {
      const ratio = ((server.onlineCount / server.memberCount) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(ratio / 5)) + '░'.repeat(20 - Math.round(ratio / 5));
      output += `${server.name}: ${bar} ${ratio}%\n`;
    }
  }

  return output;
}

// Main execution
if (require.main === module) {
  scrapeDiscordCommunities()
    .then(data => {
      console.log('\n' + formatDiscordSection(data));
      console.log('\nData saved to data/discord/');
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

module.exports = { scrapeDiscordCommunities, formatDiscordSection };
