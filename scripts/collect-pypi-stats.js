#!/usr/bin/env node
/**
 * Collect PyPI download statistics for AI coding tools
 * Uses pypistats.org API for download counts
 */

const fs = require('fs');
const path = require('path');

// Python packages related to AI coding tools
const PACKAGES = [
    { name: 'aider-chat', tool: 'Aider', category: 'ai-coding' },
    { name: 'aider-install', tool: 'Aider', category: 'ai-coding' },
    { name: 'mentat', tool: 'Mentat', category: 'ai-coding' },
    { name: 'openai', tool: 'OpenAI SDK', category: 'llm-sdk' },
    { name: 'anthropic', tool: 'Anthropic SDK', category: 'llm-sdk' },
    { name: 'langchain', tool: 'LangChain', category: 'framework' },
    { name: 'llama-index', tool: 'LlamaIndex', category: 'framework' },
    { name: 'litellm', tool: 'LiteLLM', category: 'llm-sdk' },
    { name: 'pydantic-ai', tool: 'Pydantic AI', category: 'framework' },
    { name: 'instructor', tool: 'Instructor', category: 'framework' },
    { name: 'marvin', tool: 'Marvin', category: 'framework' },
    { name: 'dspy-ai', tool: 'DSPy', category: 'framework' },
    { name: 'autogen', tool: 'AutoGen', category: 'agents' },
    { name: 'crewai', tool: 'CrewAI', category: 'agents' },
    { name: 'guidance', tool: 'Guidance', category: 'framework' },
    { name: 'outlines', tool: 'Outlines', category: 'framework' },
];

async function fetchPyPIStats(packageName) {
    // Get recent downloads from pypistats.org API
    const url = `https://pypistats.org/api/packages/${packageName}/recent`;
    
    try {
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });
        
        if (!res.ok) {
            console.error(`  ✗ ${packageName}: HTTP ${res.status}`);
            return null;
        }
        
        const data = await res.json();
        return {
            package: packageName,
            data: data.data || {},
            lastDay: data.data?.last_day || 0,
            lastWeek: data.data?.last_week || 0,
            lastMonth: data.data?.last_month || 0
        };
    } catch (err) {
        console.error(`  ✗ ${packageName}: ${err.message}`);
        return null;
    }
}

async function fetchPackageInfo(packageName) {
    // Get package metadata from PyPI
    const url = `https://pypi.org/pypi/${packageName}/json`;
    
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        
        const data = await res.json();
        const info = data.info || {};
        
        return {
            version: info.version,
            summary: info.summary,
            homePage: info.home_page || info.project_url,
            author: info.author,
            license: info.license,
            requiresPython: info.requires_python
        };
    } catch (err) {
        return null;
    }
}

async function main() {
    console.log('Collecting PyPI stats...\n');
    
    const results = [];
    const errors = [];
    
    for (const pkg of PACKAGES) {
        console.log(`Fetching ${pkg.name}...`);
        
        // Add small delay to be nice to the API
        await new Promise(r => setTimeout(r, 200));
        
        const stats = await fetchPyPIStats(pkg.name);
        const info = await fetchPackageInfo(pkg.name);
        
        if (stats && stats.lastMonth > 0) {
            results.push({
                package: pkg.name,
                tool: pkg.tool,
                category: pkg.category,
                version: info?.version || 'unknown',
                summary: info?.summary || '',
                lastDay: stats.lastDay,
                lastWeek: stats.lastWeek,
                lastMonth: stats.lastMonth
            });
            console.log(`  ✓ ${pkg.name}: ${stats.lastMonth.toLocaleString()} downloads/month`);
        } else {
            errors.push(`${pkg.name}: No data`);
        }
    }
    
    // Sort by monthly downloads
    results.sort((a, b) => b.lastMonth - a.lastMonth);
    
    // Calculate totals
    const aiCodingTotal = results
        .filter(r => r.category === 'ai-coding')
        .reduce((sum, r) => sum + r.lastMonth, 0);
    
    const sdkTotal = results
        .filter(r => r.category === 'llm-sdk')
        .reduce((sum, r) => sum + r.lastMonth, 0);
    
    const frameworkTotal = results
        .filter(r => r.category === 'framework')
        .reduce((sum, r) => sum + r.lastMonth, 0);
    
    const output = {
        generatedAt: new Date().toISOString(),
        packageCount: results.length,
        packages: results,
        byCategory: {
            'ai-coding': results.filter(r => r.category === 'ai-coding'),
            'llm-sdk': results.filter(r => r.category === 'llm-sdk'),
            'framework': results.filter(r => r.category === 'framework'),
            'agents': results.filter(r => r.category === 'agents')
        },
        summary: {
            aiCodingDownloads: aiCodingTotal,
            sdkDownloads: sdkTotal,
            frameworkDownloads: frameworkTotal,
            totalMonthly: results.reduce((sum, r) => sum + r.lastMonth, 0)
        },
        errors
    };
    
    // Write JSON
    const outPath = path.join(__dirname, '../site/data/pypi-stats.json');
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`\nWrote ${outPath}`);
    
    // Summary
    console.log('\n=== Summary ===');
    console.log(`Packages tracked: ${results.length}`);
    console.log(`AI Coding monthly: ${aiCodingTotal.toLocaleString()}`);
    console.log(`LLM SDK monthly: ${sdkTotal.toLocaleString()}`);
    console.log(`Frameworks monthly: ${frameworkTotal.toLocaleString()}`);
    
    if (errors.length) {
        console.log(`\nErrors: ${errors.length}`);
    }
}

main().catch(console.error);
