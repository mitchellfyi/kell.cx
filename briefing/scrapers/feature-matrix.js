#!/usr/bin/env node
/**
 * Feature Comparison Matrix Generator
 * 
 * Tracks and compares features across AI coding tools.
 * Sources: Official docs, pricing pages, feature lists
 */

const fs = require('fs');
const path = require('path');

// Feature categories and what to track
const FEATURE_CATEGORIES = {
  'Code Completion': {
    'Inline suggestions': 'Real-time code completion as you type',
    'Multi-line completion': 'Suggests multiple lines of code',
    'Multi-file context': 'Uses other files in project for context',
    'Custom models': 'Ability to use/fine-tune custom models',
  },
  'Chat/Agent': {
    'Chat interface': 'Conversational code assistance',
    'Agentic coding': 'Autonomous task execution',
    'Terminal integration': 'Can run commands in terminal',
    'Multi-file edits': 'Can modify multiple files at once',
  },
  'IDE Support': {
    'VS Code': 'Visual Studio Code extension',
    'JetBrains': 'IntelliJ, PyCharm, etc.',
    'Neovim': 'Neovim plugin',
    'Web IDE': 'Browser-based coding environment',
  },
  'Enterprise': {
    'Self-hosted': 'On-premise deployment option',
    'SSO/SAML': 'Enterprise authentication',
    'Audit logs': 'Activity logging for compliance',
    'Private codebase training': 'Train on proprietary code',
  },
  'Pricing': {
    'Free tier': 'Has a free plan',
    'Usage-based': 'Pay per use vs flat rate',
    'Team plans': 'Pricing for teams/orgs',
  }
};

// Current known feature support (manually curated + scraped)
const COMPETITOR_FEATURES = {
  'Cursor': {
    'Inline suggestions': true,
    'Multi-line completion': true,
    'Multi-file context': true,
    'Custom models': true,
    'Chat interface': true,
    'Agentic coding': true,
    'Terminal integration': true,
    'Multi-file edits': true,
    'VS Code': true, // It IS a VS Code fork
    'JetBrains': false,
    'Neovim': false,
    'Web IDE': false,
    'Self-hosted': false,
    'SSO/SAML': true,
    'Audit logs': true,
    'Private codebase training': false,
    'Free tier': true,
    'Usage-based': true,
    'Team plans': true,
  },
  'GitHub Copilot': {
    'Inline suggestions': true,
    'Multi-line completion': true,
    'Multi-file context': true,
    'Custom models': false,
    'Chat interface': true,
    'Agentic coding': true, // Copilot Workspace
    'Terminal integration': true,
    'Multi-file edits': true,
    'VS Code': true,
    'JetBrains': true,
    'Neovim': true,
    'Web IDE': true, // github.dev
    'Self-hosted': false,
    'SSO/SAML': true,
    'Audit logs': true,
    'Private codebase training': false,
    'Free tier': true, // Free for verified students/OSS
    'Usage-based': false,
    'Team plans': true,
  },
  'Windsurf (Codeium)': {
    'Inline suggestions': true,
    'Multi-line completion': true,
    'Multi-file context': true,
    'Custom models': false,
    'Chat interface': true,
    'Agentic coding': true, // Cascade
    'Terminal integration': true,
    'Multi-file edits': true,
    'VS Code': true,
    'JetBrains': true,
    'Neovim': true,
    'Web IDE': false,
    'Self-hosted': true,
    'SSO/SAML': true,
    'Audit logs': true,
    'Private codebase training': true,
    'Free tier': true,
    'Usage-based': false,
    'Team plans': true,
  },
  'Devin (Cognition)': {
    'Inline suggestions': false,
    'Multi-line completion': false,
    'Multi-file context': true,
    'Custom models': false,
    'Chat interface': true,
    'Agentic coding': true,
    'Terminal integration': true,
    'Multi-file edits': true,
    'VS Code': false,
    'JetBrains': false,
    'Neovim': false,
    'Web IDE': true, // Devin is web-based
    'Self-hosted': false,
    'SSO/SAML': true,
    'Audit logs': true,
    'Private codebase training': false,
    'Free tier': false,
    'Usage-based': true, // ACU-based
    'Team plans': true,
  },
  'Replit': {
    'Inline suggestions': true,
    'Multi-line completion': true,
    'Multi-file context': true,
    'Custom models': false,
    'Chat interface': true,
    'Agentic coding': true, // Replit Agent
    'Terminal integration': true,
    'Multi-file edits': true,
    'VS Code': false,
    'JetBrains': false,
    'Neovim': false,
    'Web IDE': true,
    'Self-hosted': false,
    'SSO/SAML': true,
    'Audit logs': true,
    'Private codebase training': false,
    'Free tier': true,
    'Usage-based': true,
    'Team plans': true,
  },
  'Tabnine': {
    'Inline suggestions': true,
    'Multi-line completion': true,
    'Multi-file context': true,
    'Custom models': true,
    'Chat interface': true,
    'Agentic coding': false,
    'Terminal integration': false,
    'Multi-file edits': false,
    'VS Code': true,
    'JetBrains': true,
    'Neovim': true,
    'Web IDE': false,
    'Self-hosted': true,
    'SSO/SAML': true,
    'Audit logs': true,
    'Private codebase training': true,
    'Free tier': true,
    'Usage-based': false,
    'Team plans': true,
  },
  'Sourcegraph Cody': {
    'Inline suggestions': true,
    'Multi-line completion': true,
    'Multi-file context': true,
    'Custom models': true,
    'Chat interface': true,
    'Agentic coding': false,
    'Terminal integration': false,
    'Multi-file edits': true,
    'VS Code': true,
    'JetBrains': true,
    'Neovim': true,
    'Web IDE': true,
    'Self-hosted': true,
    'SSO/SAML': true,
    'Audit logs': true,
    'Private codebase training': true,
    'Free tier': true,
    'Usage-based': true,
    'Team plans': true,
  },
  'Continue.dev': {
    'Inline suggestions': true,
    'Multi-line completion': true,
    'Multi-file context': true,
    'Custom models': true, // Open source, any model
    'Chat interface': true,
    'Agentic coding': true,
    'Terminal integration': true,
    'Multi-file edits': true,
    'VS Code': true,
    'JetBrains': true,
    'Neovim': false,
    'Web IDE': false,
    'Self-hosted': true, // Open source
    'SSO/SAML': false,
    'Audit logs': false,
    'Private codebase training': true,
    'Free tier': true, // Open source
    'Usage-based': false,
    'Team plans': false,
  },
  'Supermaven': {
    'Inline suggestions': true,
    'Multi-line completion': true,
    'Multi-file context': true,
    'Custom models': false,
    'Chat interface': true,
    'Agentic coding': false,
    'Terminal integration': false,
    'Multi-file edits': false,
    'VS Code': true,
    'JetBrains': true,
    'Neovim': true,
    'Web IDE': false,
    'Self-hosted': false,
    'SSO/SAML': false,
    'Audit logs': false,
    'Private codebase training': false,
    'Free tier': true,
    'Usage-based': false,
    'Team plans': true,
  },
  'Augment Code': {
    'Inline suggestions': true,
    'Multi-line completion': true,
    'Multi-file context': true,
    'Custom models': false,
    'Chat interface': true,
    'Agentic coding': true,
    'Terminal integration': true,
    'Multi-file edits': true,
    'VS Code': true,
    'JetBrains': true,
    'Neovim': false,
    'Web IDE': false,
    'Self-hosted': true,
    'SSO/SAML': true,
    'Audit logs': true,
    'Private codebase training': true,
    'Free tier': true,
    'Usage-based': false,
    'Team plans': true,
  },
  'Amazon Q Developer': {
    'Inline suggestions': true,
    'Multi-line completion': true,
    'Multi-file context': true,
    'Custom models': false,
    'Chat interface': true,
    'Agentic coding': true,
    'Terminal integration': true,
    'Multi-file edits': true,
    'VS Code': true,
    'JetBrains': true,
    'Neovim': false,
    'Web IDE': true, // AWS Console
    'Self-hosted': false,
    'SSO/SAML': true,
    'Audit logs': true,
    'Private codebase training': true,
    'Free tier': true,
    'Usage-based': false,
    'Team plans': true,
  },
  'Lovable': {
    'Inline suggestions': false,
    'Multi-line completion': false,
    'Multi-file context': true,
    'Custom models': false,
    'Chat interface': true,
    'Agentic coding': true,
    'Terminal integration': false,
    'Multi-file edits': true,
    'VS Code': false,
    'JetBrains': false,
    'Neovim': false,
    'Web IDE': true,
    'Self-hosted': false,
    'SSO/SAML': false,
    'Audit logs': false,
    'Private codebase training': false,
    'Free tier': true,
    'Usage-based': true,
    'Team plans': true,
  },
  'Bolt.new': {
    'Inline suggestions': false,
    'Multi-line completion': false,
    'Multi-file context': true,
    'Custom models': false,
    'Chat interface': true,
    'Agentic coding': true,
    'Terminal integration': true,
    'Multi-file edits': true,
    'VS Code': false,
    'JetBrains': false,
    'Neovim': false,
    'Web IDE': true,
    'Self-hosted': false,
    'SSO/SAML': false,
    'Audit logs': false,
    'Private codebase training': false,
    'Free tier': true,
    'Usage-based': true,
    'Team plans': true,
  },
  'v0 (Vercel)': {
    'Inline suggestions': false,
    'Multi-line completion': false,
    'Multi-file context': true,
    'Custom models': false,
    'Chat interface': true,
    'Agentic coding': true,
    'Terminal integration': false,
    'Multi-file edits': true,
    'VS Code': false,
    'JetBrains': false,
    'Neovim': false,
    'Web IDE': true,
    'Self-hosted': false,
    'SSO/SAML': true,
    'Audit logs': false,
    'Private codebase training': false,
    'Free tier': true,
    'Usage-based': true,
    'Team plans': true,
  },
};

// Generate markdown comparison table
function generateMarkdownTable() {
  const competitors = Object.keys(COMPETITOR_FEATURES);
  let md = '# AI Coding Tools Feature Comparison\n\n';
  md += `*Last updated: ${new Date().toISOString().split('T')[0]}*\n\n`;
  
  for (const [category, features] of Object.entries(FEATURE_CATEGORIES)) {
    md += `## ${category}\n\n`;
    md += '| Feature | ' + competitors.join(' | ') + ' |\n';
    md += '|---------|' + competitors.map(() => '---').join('|') + '|\n';
    
    for (const [feature, description] of Object.entries(features)) {
      md += `| ${feature} | `;
      md += competitors.map(comp => {
        const val = COMPETITOR_FEATURES[comp][feature];
        if (val === true) return '✅';
        if (val === false) return '❌';
        return '❓';
      }).join(' | ');
      md += ' |\n';
    }
    md += '\n';
  }
  
  return md;
}

// Generate HTML comparison table for web
function generateHTMLTable() {
  const competitors = Object.keys(COMPETITOR_FEATURES);
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Coding Tools Feature Comparison | Briefing by Kell</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a; 
      color: #e5e5e5;
      padding: 2rem;
    }
    h1 { 
      color: #00d4ff; 
      margin-bottom: 0.5rem;
      font-size: 2rem;
    }
    .subtitle {
      color: #888;
      margin-bottom: 2rem;
    }
    .category {
      margin-bottom: 2rem;
    }
    h2 {
      color: #00d4ff;
      font-size: 1.2rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #333;
    }
    .table-wrapper {
      overflow-x: auto;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      font-size: 0.85rem;
    }
    th, td {
      padding: 0.75rem;
      text-align: center;
      border: 1px solid #333;
    }
    th {
      background: #1a1a2e;
      color: #00d4ff;
      font-weight: 600;
      position: sticky;
      top: 0;
    }
    th:first-child, td:first-child {
      text-align: left;
      min-width: 150px;
    }
    tr:nth-child(even) { background: #111; }
    tr:hover { background: #1a1a2e; }
    .yes { color: #00ff88; }
    .no { color: #666; }
    .unknown { color: #ff9900; }
    .cta {
      margin-top: 2rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, #1a1a2e, #0f0f23);
      border: 1px solid #00d4ff;
      border-radius: 8px;
      text-align: center;
    }
    .cta a {
      color: #00d4ff;
      text-decoration: none;
      font-weight: bold;
    }
    .cta a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>AI Coding Tools Feature Comparison</h1>
  <p class="subtitle">Comprehensive comparison of ${competitors.length} AI coding assistants — Updated ${new Date().toISOString().split('T')[0]}</p>
`;

  for (const [category, features] of Object.entries(FEATURE_CATEGORIES)) {
    html += `  <div class="category">
    <h2>${category}</h2>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            ${competitors.map(c => `<th>${c}</th>`).join('\n            ')}
          </tr>
        </thead>
        <tbody>
`;
    
    for (const [feature, description] of Object.entries(features)) {
      html += `          <tr>
            <td title="${description}">${feature}</td>
`;
      for (const comp of competitors) {
        const val = COMPETITOR_FEATURES[comp][feature];
        if (val === true) {
          html += `            <td class="yes">✓</td>\n`;
        } else if (val === false) {
          html += `            <td class="no">—</td>\n`;
        } else {
          html += `            <td class="unknown">?</td>\n`;
        }
      }
      html += `          </tr>\n`;
    }
    
    html += `        </tbody>
      </table>
    </div>
  </div>
`;
  }

  html += `  <div class="cta">
    <p>Get daily competitive intelligence on all these tools delivered to your inbox.</p>
    <p><a href="https://kell.cx">Try Briefing free →</a></p>
  </div>
</body>
</html>`;

  return html;
}

// Generate JSON data for programmatic use
function generateJSON() {
  return {
    lastUpdated: new Date().toISOString(),
    categories: FEATURE_CATEGORIES,
    competitors: COMPETITOR_FEATURES,
  };
}

// Main
async function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  const publicDir = path.join(process.env.HOME, 'clawd', 'public');
  
  // Ensure directories exist
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  
  // Generate all formats
  const markdown = generateMarkdownTable();
  const html = generateHTMLTable();
  const json = generateJSON();
  
  // Save to data directory
  fs.writeFileSync(path.join(dataDir, 'feature-matrix.md'), markdown);
  fs.writeFileSync(path.join(dataDir, 'feature-matrix.json'), JSON.stringify(json, null, 2));
  
  // Publish HTML to public directory
  fs.writeFileSync(path.join(publicDir, 'feature-comparison.html'), html);
  
  console.log('✅ Feature comparison matrix generated');
  console.log(`   - ${Object.keys(COMPETITOR_FEATURES).length} competitors`);
  console.log(`   - ${Object.values(FEATURE_CATEGORIES).reduce((a, b) => a + Object.keys(b).length, 0)} features tracked`);
  console.log(`   - Published to: https://kellai.online/public/feature-comparison.html`);
  
  return json;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateMarkdownTable, generateHTMLTable, generateJSON, COMPETITOR_FEATURES };
