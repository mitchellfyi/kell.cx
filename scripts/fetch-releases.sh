#!/bin/bash
# Fetch releases from GitHub for AI coding tools

TOOLS=(
  "anthropics/claude-code:Claude Code"
  "cline/cline:Cline"  
  "Aider-AI/aider:Aider"
  "continuedev/continue:Continue"
  "TabbyML/tabby:Tabby"
  "sourcegraph/cody:Cody"
  "CodiumAI/pr-agent:PR-Agent"
  "zed-industries/zed:Zed"
)

echo "["
first=true
for entry in "${TOOLS[@]}"; do
  repo="${entry%%:*}"
  name="${entry##*:}"
  
  # Fetch latest 5 releases
  releases=$(gh api "repos/${repo}/releases?per_page=5" 2>/dev/null)
  if [ $? -eq 0 ] && [ "$releases" != "[]" ]; then
    while read -r line; do
      if [ "$first" = false ]; then echo ","; fi
      first=false
      echo "$line" | jq -c ". + {tool: \"$name\", repo: \"$repo\"}"
    done < <(echo "$releases" | jq -c '.[]')
  fi
done
echo "]"
