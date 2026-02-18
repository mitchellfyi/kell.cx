#!/bin/bash
# Master Data Refresh Script for kell.cx
# Runs all scrapers and updates meta.json
# Usage: ./refresh-all.sh [--quick]

set -e
cd "$(dirname "$0")/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Load GitHub token from gh CLI config
export GITHUB_TOKEN=$(grep -A1 "mitchellfyi:" ~/.config/gh/hosts.yml | grep oauth_token | awk '{print $2}' | head -1)

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${YELLOW}Warning: No GitHub token found. API calls may be rate limited.${NC}"
fi

QUICK_MODE=false
if [ "$1" == "--quick" ]; then
    QUICK_MODE=true
    echo -e "${YELLOW}Quick mode: skipping slow scrapers${NC}"
fi

echo "═══════════════════════════════════════════════════════════════"
echo " Kell.cx Data Refresh - $(date '+%Y-%m-%d %H:%M:%S UTC')"
echo "═══════════════════════════════════════════════════════════════"
echo ""

FAILED=()
SUCCESS=()

run_scraper() {
    local name=$1
    local script=$2
    echo -n "  ⏳ $name... "
    if timeout 120 node "$script" > /tmp/scraper-out.txt 2>&1; then
        echo -e "${GREEN}✓${NC}"
        SUCCESS+=("$name")
    else
        echo -e "${RED}✗${NC}"
        cat /tmp/scraper-out.txt | head -5
        FAILED+=("$name")
    fi
}

# ═══════════════════════════════════════════════════════════════
# CRITICAL DATA (used directly by pages)
# ═══════════════════════════════════════════════════════════════
echo "📊 Critical Data Sources"
echo "───────────────────────────────────────────────────────────────"

run_scraper "GitHub Releases" "scrapers/github-releases.js"
run_scraper "LMArena Leaderboard" "scrapers/lmarena-leaderboard.js"
run_scraper "Aider Benchmark" "scrapers/aider-benchmark.js"
run_scraper "HN AI Mentions" "scrapers/hn-ai-mentions.js"
run_scraper "SWE-Bench" "scrapers/swe-bench.js"

# ═══════════════════════════════════════════════════════════════
# NEWS & FEEDS
# ═══════════════════════════════════════════════════════════════
echo ""
echo "📰 News & Feeds"
echo "───────────────────────────────────────────────────────────────"

run_scraper "AI RSS Feeds" "scrapers/ai-rss-feeds.js"
run_scraper "Reddit AI" "scrapers/reddit-ai.js"
run_scraper "Bluesky AI" "scrapers/bluesky-ai.js"
run_scraper "Dev.to AI" "scrapers/devto-ai.js"
run_scraper "TechCrunch AI" "scrapers/techcrunch-ai.js"
run_scraper "ProductHunt AI" "scrapers/producthunt-ai.js"

# ═══════════════════════════════════════════════════════════════
# COMPANY NEWS
# ═══════════════════════════════════════════════════════════════
echo ""
echo "🏢 Company News"
echo "───────────────────────────────────────────────────────────────"

run_scraper "OpenAI News" "scrapers/openai-news.js"
run_scraper "Anthropic News" "scrapers/anthropic-news.js"
run_scraper "Google AI Blog" "scrapers/google-ai-blog.js"
run_scraper "DeepMind News" "scrapers/deepmind-news.js"
run_scraper "Mistral News" "scrapers/mistral-news.js"

# ═══════════════════════════════════════════════════════════════
# RESEARCH & MODELS
# ═══════════════════════════════════════════════════════════════
echo ""
echo "🔬 Research & Models"
echo "───────────────────────────────────────────────────────────────"

run_scraper "ArXiv AI" "scrapers/arxiv-ai.js"
run_scraper "HuggingFace Trending" "scrapers/huggingface-trending.js"
run_scraper "Model Releases" "scrapers/model-releases.js"

if [ "$QUICK_MODE" = false ]; then
    run_scraper "Company Announcements" "scrapers/company-announcements.js"
fi

# ═══════════════════════════════════════════════════════════════
# STATS & METRICS
# ═══════════════════════════════════════════════════════════════
echo ""
echo "📈 Stats & Metrics"
echo "───────────────────────────────────────────────────────────────"

run_scraper "VS Code Stats" "scripts/collect-vscode-stats.js"
run_scraper "GitHub Trending" "scripts/collect-github-trending.js"
run_scraper "Pricing Monitor" "scrapers/pricing-monitor.js"

# Copy site/data files to main data dir (some scripts output there)
cp -f site/data/vscode-stats.json data/ 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════
# GENERATOR SCRIPTS
# ═══════════════════════════════════════════════════════════════
echo ""
echo "🔧 Generators"
echo "───────────────────────────────────────────────────────────────"

run_scraper "Aggregate News" "scripts/aggregate-news.js"
run_scraper "Generate Insights" "scripts/generate-insights.js"

# ═══════════════════════════════════════════════════════════════
# UPDATE META
# ═══════════════════════════════════════════════════════════════
echo ""
echo "📝 Updating metadata..."
cat > data/meta.json << EOF
{
  "lastRefresh": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "toolsTracked": 15,
  "scrapersRun": ${#SUCCESS[@]},
  "scrapersFailed": ${#FAILED[@]}
}
EOF
echo -e "  ${GREEN}✓${NC} meta.json updated"

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " Summary"
echo "═══════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}Success:${NC} ${#SUCCESS[@]}"
echo -e "  ${RED}Failed:${NC}  ${#FAILED[@]}"

if [ ${#FAILED[@]} -gt 0 ]; then
    echo ""
    echo "  Failed scrapers:"
    for f in "${FAILED[@]}"; do
        echo -e "    ${RED}•${NC} $f"
    done
fi

echo ""
echo "Done at $(date '+%Y-%m-%d %H:%M:%S UTC')"
