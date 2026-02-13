import Link from "next/link";

export const metadata = {
  title: "AI Models for Coding — Kell",
  description: "Foundation and coding-specific models powering AI coding tools. Compare capabilities and pricing.",
};

const foundationModels = [
  { name: "GPT-5", provider: "OpenAI", release: "Jan 2026", codingScore: 88, input: 10, output: 30, context: "256K" },
  { name: "Claude 4.5 Opus", provider: "Anthropic", release: "Oct 2025", codingScore: 84, input: 15, output: 75, context: "200K" },
  { name: "Gemini 3 Pro", provider: "Google", release: "Nov 2025", codingScore: 83, input: 1.25, output: 5, context: "2M" },
  { name: "Claude 4.5 Sonnet", provider: "Anthropic", release: "Sep 2025", codingScore: 79, input: 3, output: 15, context: "200K" },
  { name: "GPT-5.3 Codex", provider: "OpenAI", release: "Feb 2026", codingScore: 86, input: 5, output: 15, context: "128K" },
  { name: "Grok-4", provider: "xAI", release: "Jan 2026", codingScore: 80, input: 5, output: 25, context: "128K" },
  { name: "o3", provider: "OpenAI", release: "Dec 2025", codingScore: 81, input: 15, output: 60, context: "200K" },
];

const codingModels = [
  { name: "GPT-5.3 Codex", provider: "OpenAI", usedBy: "Codex, Copilot", specialty: "Multi-language, agentic" },
  { name: "Claude 4.5 Sonnet", provider: "Anthropic", usedBy: "Claude Code, Cursor", specialty: "Tool use, long context" },
  { name: "Codestral", provider: "Mistral", usedBy: "Continue, Tabby", specialty: "Fast, open weights" },
  { name: "DeepSeek Coder V3", provider: "DeepSeek", usedBy: "Aider, OSS tools", specialty: "Cost-effective, strong perf" },
  { name: "StarCoder2", provider: "BigCode", usedBy: "Various OSS", specialty: "15B params, fully open" },
  { name: "CodeLlama 70B", provider: "Meta", usedBy: "Self-hosted", specialty: "Fine-tunable, on-prem" },
];

const toolModelMapping = [
  { tool: "Cursor", models: "GPT-5, Claude 4.5 Sonnet, o3" },
  { tool: "GitHub Copilot", models: "GPT-5.3 Codex" },
  { tool: "Claude Code", models: "Claude 4.5 Sonnet, Claude 4.5 Opus" },
  { tool: "Codex", models: "GPT-5.3 Codex" },
  { tool: "Windsurf", models: "GPT-5, Claude 4.5, Gemini 3" },
  { tool: "Cline", models: "User's choice (API key)" },
  { tool: "Aider", models: "User's choice (API key)" },
  { tool: "Continue", models: "User's choice (API key)" },
];

function getScoreStyle(score: number): string {
  if (score >= 85) return "text-green-400";
  if (score >= 75) return "text-amber-400";
  return "text-zinc-400";
}

export default function ModelsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="text-sm text-zinc-500 mb-4">
        <Link href="/data" className="hover:text-white">Data</Link> → Models
      </div>

      <h1 className="text-2xl font-semibold tracking-tight mb-2">🧠 AI Models for Coding</h1>
      <p className="text-zinc-400 mb-8">Foundation and coding-specific models powering the ecosystem</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
          <div className="text-2xl font-semibold text-white">7</div>
          <div className="text-xs text-zinc-500 mt-1">Foundation Models</div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
          <div className="text-2xl font-semibold text-white">6</div>
          <div className="text-xs text-zinc-500 mt-1">Coding-Specific</div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
          <div className="text-2xl font-semibold text-green-400">88%</div>
          <div className="text-xs text-zinc-500 mt-1">Top Aider Score</div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
          <div className="text-2xl font-semibold text-white">4</div>
          <div className="text-xs text-zinc-500 mt-1">Major Providers</div>
        </div>
      </div>

      {/* Foundation Models */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
          Foundation Models (by Aider Polyglot Score)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-3 pr-4">Model</th>
                <th className="pb-3 pr-4">Provider</th>
                <th className="pb-3 pr-4 w-24">Coding %</th>
                <th className="pb-3 pr-4">Input $/M</th>
                <th className="pb-3 pr-4">Output $/M</th>
                <th className="pb-3">Context</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {foundationModels.map((model) => (
                <tr key={model.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 pr-4 font-medium text-white">{model.name}</td>
                  <td className="py-3 pr-4 text-zinc-400">{model.provider}</td>
                  <td className={`py-3 pr-4 font-mono ${getScoreStyle(model.codingScore)}`}>
                    {model.codingScore}%
                  </td>
                  <td className="py-3 pr-4 text-zinc-500">${model.input}</td>
                  <td className="py-3 pr-4 text-zinc-500">${model.output}</td>
                  <td className="py-3 text-zinc-500">{model.context}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-600 mt-3">
          Coding scores from <a href="https://aider.chat/docs/leaderboards/" className="text-blue-400" target="_blank" rel="noopener noreferrer">Aider Polyglot benchmark</a>. Prices per million tokens.
        </p>
      </section>

      {/* Coding-Specific Models */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
          Coding-Specific Models
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-3 pr-4">Model</th>
                <th className="pb-3 pr-4">Provider</th>
                <th className="pb-3 pr-4">Used By</th>
                <th className="pb-3">Specialty</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {codingModels.map((model) => (
                <tr key={model.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 pr-4 font-medium text-white">{model.name}</td>
                  <td className="py-3 pr-4 text-zinc-400">{model.provider}</td>
                  <td className="py-3 pr-4 text-zinc-400">{model.usedBy}</td>
                  <td className="py-3 text-zinc-500">{model.specialty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tool → Model Mapping */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
          Which Tools Use Which Models
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {toolModelMapping.map((t) => (
            <div key={t.tool} className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
              <div className="font-medium text-white text-sm">{t.tool}</div>
              <div className="text-xs text-zinc-400 mt-1">{t.models}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Observations */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
          Key Observations
        </h2>
        <div className="space-y-3 text-sm text-zinc-400">
          <p>
            <strong className="text-white">GPT-5 leads benchmarks:</strong> 88% on Aider Polyglot, but at $30/M output — 2x Claude Sonnet.
          </p>
          <p>
            <strong className="text-white">Claude dominates agents:</strong> Tool use and long context make it the default for agentic coding.
          </p>
          <p>
            <strong className="text-white">BYOK rising:</strong> Cline, Aider, Continue let users pick models — flexibility over vendor lock-in.
          </p>
          <p>
            <strong className="text-white">Context wars:</strong> Gemini 3 Pro&apos;s 2M context is 10x competitors — matters for large codebases.
          </p>
        </div>
      </section>
    </div>
  );
}
