#!/usr/bin/env node
/**
 * Generate consolidated live intel JSON for the landing page
 * Pulls from various data sources and outputs the most interesting stats
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../site/data');
const outputPath = path.join(dataDir, 'live-intel.json');

function readJSON(filename) {
    try {
        const filepath = path.join(dataDir, filename);
        return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    } catch (e) {
        console.warn(`  ⚠ Could not read ${filename}: ${e.message}`);
        return null;
    }
}

function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function relativeTime(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

console.log('Generating live intel...\n');

const intel = {
    generatedAt: new Date().toISOString(),
    stats: []
};

// VS Code Extensions - Top installs
const vscode = readJSON('vscode-stats.json');
if (vscode && vscode.extensions?.length) {
    const top = vscode.extensions[0];
    intel.stats.push({
        icon: '📊',
        value: formatNumber(top.installs),
        label: 'VS Code installs',
        subject: top.name,
        source: 'vscode'
    });
    console.log(`  ✓ VS Code: ${top.name} - ${formatNumber(top.installs)} installs`);
    
    // Total installs across all tracked
    intel.stats.push({
        icon: '🔧',
        value: formatNumber(vscode.totalInstalls),
        label: 'Total extensions',
        subject: `${vscode.extensionCount} tools tracked`,
        source: 'vscode-total'
    });
}

// GitHub Stars - Top repo
const github = readJSON('github-stats.json');
if (github && github.tools?.length) {
    const leader = github.tools.find(t => t.isLeader) || github.tools[0];
    intel.stats.push({
        icon: '⭐',
        value: leader.starsFormatted,
        label: 'GitHub stars',
        subject: leader.name,
        source: 'github'
    });
    console.log(`  ✓ GitHub: ${leader.name} - ${leader.starsFormatted} stars`);
    
    // Count hot repos (active today)
    const hotRepos = github.tools.filter(t => t.activity === 'hot').length;
    intel.stats.push({
        icon: '🔥',
        value: hotRepos.toString(),
        label: 'Active today',
        subject: 'Repos with commits',
        source: 'github-hot'
    });
}

// PyPI Downloads
const pypi = readJSON('pypi-stats.json');
if (pypi && pypi.packages?.length) {
    const topPypi = pypi.packages.sort((a, b) => (b.lastWeek || 0) - (a.lastWeek || 0))[0];
    if (topPypi && topPypi.lastWeek) {
        intel.stats.push({
            icon: '🐍',
            value: formatNumber(topPypi.lastWeek),
            label: 'Weekly downloads',
            subject: topPypi.tool || topPypi.package,
            source: 'pypi'
        });
        console.log(`  ✓ PyPI: ${topPypi.tool || topPypi.package} - ${formatNumber(topPypi.lastWeek)}/week`);
    }
}

// NPM Downloads
const npm = readJSON('npm-stats.json');
if (npm && npm.packages?.length) {
    const topNpm = npm.packages.sort((a, b) => (b.weeklyDownloads || 0) - (a.weeklyDownloads || 0))[0];
    if (topNpm && topNpm.weeklyDownloads) {
        intel.stats.push({
            icon: '📦',
            value: formatNumber(topNpm.weeklyDownloads),
            label: 'NPM weekly',
            subject: topNpm.displayName || topNpm.package,
            source: 'npm'
        });
        console.log(`  ✓ NPM: ${topNpm.displayName || topNpm.package} - ${formatNumber(topNpm.weeklyDownloads)}/week`);
    }
}

// Homebrew installs
const homebrew = readJSON('homebrew-stats.json');
if (homebrew && homebrew.tools?.length) {
    const topBrew = homebrew.tools.sort((a, b) => (b.installs30d || 0) - (a.installs30d || 0))[0];
    if (topBrew && topBrew.installs30d) {
        intel.stats.push({
            icon: '🍺',
            value: formatNumber(topBrew.installs30d),
            label: '30-day installs',
            subject: topBrew.name,
            source: 'homebrew'
        });
        console.log(`  ✓ Homebrew: ${topBrew.name} - ${formatNumber(topBrew.installs30d)}/30d`);
    }
}

// Latest release
const releases = readJSON('releases.json');
if (releases && releases.latestByTool?.length) {
    // Find most recent release
    const sorted = releases.latestByTool
        .filter(r => r.publishedAt)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    if (sorted.length) {
        const latest = sorted[0];
        intel.stats.push({
            icon: '🚀',
            value: latest.latestVersion,
            label: 'Latest release',
            subject: `${latest.name} • ${latest.relativeTime}`,
            source: 'releases'
        });
        console.log(`  ✓ Releases: ${latest.name} ${latest.latestVersion} (${latest.relativeTime})`);
    }
}

// G2 Reviews
const g2 = readJSON('g2-stats.json');
if (g2 && g2.products?.length) {
    const topRated = g2.products.sort((a, b) => b.rating - a.rating)[0];
    if (topRated) {
        intel.stats.push({
            icon: '⭐',
            value: topRated.rating.toFixed(1),
            label: 'G2 rating',
            subject: topRated.name,
            source: 'g2'
        });
        console.log(`  ✓ G2: ${topRated.name} - ${topRated.rating.toFixed(1)} rating`);
    }
}

// Select top 4 most interesting stats for homepage
// Priority: VS Code installs, GitHub stars, Latest release, Active repos
const priority = ['vscode', 'github', 'releases', 'github-hot', 'pypi', 'npm', 'homebrew', 'g2'];
intel.featured = intel.stats
    .sort((a, b) => priority.indexOf(a.source) - priority.indexOf(b.source))
    .slice(0, 4);

// Tools tracked count
intel.toolsTracked = (github?.repoCount || 0) + (vscode?.extensionCount || 0);

console.log(`\n✓ Generated live intel with ${intel.stats.length} stats, featuring ${intel.featured.length}`);

// Write output
fs.writeFileSync(outputPath, JSON.stringify(intel, null, 2));
console.log(`✓ Saved to ${outputPath}`);
