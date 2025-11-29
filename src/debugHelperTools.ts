import { z } from "zod";
import { promises as fs } from "fs";
import { glob } from "glob";
import * as path from "path";
import { runStyleAudit } from "./styleAudit.js";
import { enforcePatterns } from "./stylePatterns.js";
import { generateSemanticDiff } from "./semanticDiff.js";
import { generateCSSVariables, MatchPhase } from "./matchTheme.js";

export function registerDebugHelperTools(server: any) {
  
  // Tool: trace_flow
  server.registerTool(
    "trace_flow",
    {
      description: "Trace execution flow from user action to state mutation. Maps button clicks → component mounts → useEffect → API calls → data mutations. Detects auto-triggers and premature side effects.",
      inputSchema: {
        startPoint: z.string().describe("Starting point (e.g., 'Continue button', 'Kick Off')"),
        endPoint: z.string().describe("Ending point (e.g., 'match simulation', 'fixtures.json update')"),
        workspacePath: z.string().describe("Workspace root path"),
      },
    },
    async (params: { startPoint: string; endPoint: string; workspacePath: string }) => {
      const { startPoint, endPoint, workspacePath } = params;
      try {
        const files = await glob("**/*.{ts,tsx,js,jsx}", { cwd: workspacePath, absolute: true, ignore: ["**/node_modules/**"] });
        
        let flowSteps: string[] = [];
        let issues: string[] = [];
        
        // Search for start point (button/handler)
        for (const file of files.slice(0, 50)) {
          const content = await fs.readFile(file, 'utf-8');
          const buttonMatch = content.match(new RegExp(`<[^>]*button[^>]*>\\s*${startPoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*<`, 'i'));
          
          if (buttonMatch) {
            const handlerMatch = content.substring(Math.max(0, buttonMatch.index! - 200), buttonMatch.index!).match(/onClick=\{([^}]+)\}/);
            if (handlerMatch) {
              flowSteps.push(`1. User clicks "${startPoint}" → handler: ${handlerMatch[1]} in ${path.basename(file)}`);
            }
          }
        }
        
        // Search for useEffect auto-triggers
        const effectPattern = /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{([^}]+)\}/g;
        for (const file of files.slice(0, 50)) {
          const content = await fs.readFile(file, 'utf-8');
          let match;
          while ((match = effectPattern.exec(content)) !== null) {
            if (match[1].toLowerCase().includes(endPoint.toLowerCase())) {
              const lines = content.substring(0, match.index).split('\n').length;
              flowSteps.push(`2. Component mount → useEffect (line ${lines}) auto-triggers: ${endPoint}`);
              issues.push(`⚠️ AUTO-TRIGGER DETECTED: useEffect calls ${endPoint} on mount without user action`);
            }
          }
        }
        
        // Search for API calls
        const apiPattern = /(fetch|axios\.(get|post|put|delete))\s*\(\s*['"\`]([^'"\`]+)['"\`]/g;
        for (const file of files.slice(0, 50)) {
          const content = await fs.readFile(file, 'utf-8');
          let match;
          while ((match = apiPattern.exec(content)) !== null) {
            if (match[3].toLowerCase().includes(endPoint.toLowerCase().replace(/\s+/g, '-'))) {
              const lines = content.substring(0, match.index).split('\n').length;
              const contextBefore = content.substring(Math.max(0, match.index! - 300), match.index!);
              const trigger = contextBefore.includes('useEffect') ? 'useEffect (auto)' : 'event handler';
              flowSteps.push(`3. API call: ${match[1]}('${match[3]}') triggered by ${trigger} in ${path.basename(file)}:${lines}`);
            }
          }
        }
        
        const result = `## �� Flow Trace: ${startPoint} → ${endPoint}\n\n${flowSteps.length > 0 ? flowSteps.join('\n') : '⚠️ No flow steps detected'}\n\n${issues.length > 0 ? '### 🔴 Issues Found:\n' + issues.join('\n') : '✅ No issues detected'}`;
        
        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return { content: [{ type: "text", text: `❌ Error tracing flow: ${error}` }] };
      }
    }
  );
  
  // Tool: snapshot_state
  server.registerTool(
    "snapshot_state",
    {
      description: "Capture JSON file state for before/after comparison. Useful for validating data mutations.",
      inputSchema: {
        filePath: z.string().describe("Path to JSON file to snapshot (e.g., 'fixtures.json')"),
        tag: z.string().describe("Tag for this snapshot (e.g., 'before-kick-off', 'after-simulation')"),
        workspacePath: z.string().describe("Workspace root path"),
      },
    },
    async (params: { filePath: string; tag: string; workspacePath: string }) => {
      const { filePath, tag, workspacePath } = params;
      try {
        const files = await glob(`**/${filePath}`, { cwd: workspacePath, absolute: true, ignore: ["**/node_modules/**"] });
        
        if (files.length === 0) {
          return { content: [{ type: "text", text: `❌ File not found: ${filePath}` }] };
        }
        
        const content = await fs.readFile(files[0], 'utf-8');
        const jsonData = JSON.parse(content);
        
        const result = `## 📸 Snapshot: ${filePath} [${tag}]\n\n\`\`\`json\n${JSON.stringify(jsonData, null, 2)}\n\`\`\`\n\n✅ Snapshot created with tag: ${tag}`;
        
        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return { content: [{ type: "text", text: `❌ Error creating snapshot: ${error}` }] };
      }
    }
  );
  
  // Tool: assert_no_api_calls
  server.registerTool(
    "assert_no_api_calls",
    {
      description: "Assert no API calls occur before a specific user event. Detects premature side effects from useEffect auto-triggers.",
      inputSchema: {
        event: z.string().describe("User event that should trigger API calls (e.g., 'Kick Off button')"),
        workspacePath: z.string().describe("Workspace root path"),
      },
    },
    async (params: { event: string; workspacePath: string }) => {
      const { event, workspacePath } = params;
      try {
        const files = await glob("**/*.{ts,tsx,js,jsx}", { cwd: workspacePath, absolute: true, ignore: ["**/node_modules/**"] });
        const apiPattern = /(fetch|axios\.(get|post|put|delete))\s*\([^)]*\)/g;
        
        let violations: any[] = [];
        
        for (const file of files.slice(0, 50)) {
          const content = await fs.readFile(file, 'utf-8');
          let match;
          
          while ((match = apiPattern.exec(content)) !== null) {
            const contextBefore = content.substring(Math.max(0, match.index! - 300), match.index!);
            const lines = content.substring(0, match.index).split('\n').length;
            
            if (contextBefore.includes('useEffect')) {
              violations.push({
                file: path.basename(file),
                line: lines,
                call: match[0],
                context: 'useEffect (auto-triggers on mount)'
              });
            }
          }
        }
        
        if (violations.length === 0) {
          return { content: [{ type: "text", text: `✅ PASS: No premature API calls detected before "${event}"` }] };
        } else {
          const result = `❌ FAILED: ${violations.length} violation(s) detected\n\n${violations.map((v, i) => `**Violation ${i + 1}:**\n- File: ${v.file}:${v.line}\n- Call: \`${v.call}\`\n- Context: ${v.context}\n- ⚠️ API called BEFORE "${event}"`).join('\n\n')}`;
          return { content: [{ type: "text", text: result }] };
        }
      } catch (error) {
        return { content: [{ type: "text", text: `❌ Error checking API calls: ${error}` }] };
      }
    }
  );
  
  // Tool: validate_test_coverage
  server.registerTool(
    "validate_test_coverage",
    {
      description: "Validate that integration tests cover the actual user flow. Identifies gaps in test coverage.",
      inputSchema: {
        flowSteps: z.array(z.string()).describe("Array of flow steps (e.g., ['Click Continue', 'Screen renders', 'Click Kick Off', 'Simulation runs'])"),
        workspacePath: z.string().describe("Workspace root path"),
      },
    },
    async (params: { flowSteps: string[]; workspacePath: string }) => {
      const { flowSteps, workspacePath } = params;
      try {
        const testFiles = await glob("**/*.{test,spec}.{ts,tsx,js,jsx}", { cwd: workspacePath, absolute: true, ignore: ["**/node_modules/**"] });
        
        if (testFiles.length === 0) {
          return { content: [{ type: "text", text: "❌ No test files found in workspace" }] };
        }
        
        let coverageMap: { [key: string]: boolean } = {};
        flowSteps.forEach((step: string) => {
          coverageMap[step.toLowerCase()] = false;
        });
        
        for (const file of testFiles) {
          const content = await fs.readFile(file, 'utf-8');
          
          flowSteps.forEach((step: string) => {
            if (content.toLowerCase().includes(step.toLowerCase())) {
              coverageMap[step.toLowerCase()] = true;
            }
          });
        }
        
        const uncovered = flowSteps.filter((step: string) => !coverageMap[step.toLowerCase()]);
        
        if (uncovered.length === 0) {
          return { content: [{ type: "text", text: "✅ Complete coverage! All flow steps are tested." }] };
        } else {
          const result = `🔴 Coverage Gaps: ${uncovered.length} step(s) not tested\n\n${uncovered.map((step: string) => `❌ Missing: ${step}`).join('\n')}`;
          return { content: [{ type: "text", text: result }] };
        }
      } catch (error) {
        return { content: [{ type: "text", text: `❌ Error validating test coverage: ${error}` }] };
      }
    }
  );
  
  // Tool: audit_styles
  server.registerTool(
    "audit_styles",
    {
      description: "Audit component and CSS files for style guideline violations. Checks button variants, spacing scale, raw colors, typography.",
      inputSchema: {
        workspacePath: z.string().describe("Workspace root path"),
        maxFiles: z.number().optional().describe("Maximum files to scan (default: 120)"),
      },
    },
    async (params: { workspacePath: string; maxFiles?: number }) => {
      const { workspacePath, maxFiles } = params;
      try {
        const result = await runStyleAudit(maxFiles || 120, workspacePath);
        
        if (result.issues.length === 0) {
          return { content: [{ type: "text", text: "✅ No style issues detected" }] };
        }
        
        const output = `## 🎯 Style Audit Results\n\nFound **${result.issues.length}** issue(s)\n\n${result.issues.slice(0, 50).map(issue => `- [${issue.severity}] \`${issue.file}:${issue.line}\` **${issue.rule}** → ${issue.detail}`).join('\n')}\n\n**Summary:**\n- Button variants: ${result.summary.buttons}\n- Spacing scale: ${result.summary.spacing}\n- Raw colors: ${result.summary.colors}\n- Typography: ${result.summary.typography}`;
        
        return { content: [{ type: "text", text: output }] };
      } catch (error) {
        return { content: [{ type: "text", text: `❌ Error running style audit: ${error}` }] };
      }
    }
  );
  
  // Tool: enforce_patterns
  server.registerTool(
    "enforce_patterns",
    {
      description: "Check high-level pattern enforcement rules. Returns compliance summary.",
      inputSchema: {},
    },
    async () => {
      try {
        const enforcement = enforcePatterns();
        const output = `## 🛠 Pattern Enforcement\n\n${enforcement.rules.map(r => `${r.passed ? '✅' : '⚠️'} **${r.name}** → ${r.detail}`).join('\n')}`;
        return { content: [{ type: "text", text: output }] };
      } catch (error) {
        return { content: [{ type: "text", text: `❌ Error enforcing patterns: ${error}` }] };
      }
    }
  );
  
  // Tool: semantic_diff
  server.registerTool(
    "semantic_diff",
    {
      description: "Generate semantic diff with annotations for accessibility, structure, and style impacts.",
      inputSchema: {
        before: z.string().describe("Before content/code"),
        after: z.string().describe("After content/code"),
      },
    },
    async (params: { before: string; after: string }) => {
      const { before, after } = params;
      try {
        const diffRes = generateSemanticDiff(before, after);
        
        const output = `## 🔍 Semantic Diff\n\nLines added: ${diffRes.added}, removed: ${diffRes.removed}\n\n${diffRes.annotations.length === 0 ? 'No semantic changes detected.' : '### Annotations\n' + diffRes.annotations.map(a => `- **${a.category}**: ${a.message}`).join('\n')}`;
        
        return { content: [{ type: "text", text: output }] };
      } catch (error) {
        return { content: [{ type: "text", text: `❌ Error generating diff: ${error}` }] };
      }
    }
  );
  
  // Tool: generate_phase_theme
  server.registerTool(
    "generate_phase_theme",
    {
      description: "Generate CSS variable tokens for match phase theming (prematch, in-progress, full-time).",
      inputSchema: {
        phase: z.enum(["prematch", "in-progress", "full-time"]).describe("Match phase"),
      },
    },
    async (params: { phase: string }) => {
      const { phase } = params;
      try {
        const cssVars = generateCSSVariables(phase as MatchPhase);
        const output = `## 🏟 Match Phase Theming: ${phase}\n\n\`\`\`css\n${cssVars}\n\`\`\``;
        return { content: [{ type: "text", text: output }] };
      } catch (error) {
        return { content: [{ type: "text", text: `❌ Error generating theme: ${error}` }] };
      }
    }
  );
  
  // Tool: detect_side_effects
  server.registerTool(
    "detect_side_effects",
    {
      description: "Detect side effects in components (useEffect with API calls, React StrictMode double-mount issues).",
      inputSchema: {
        componentName: z.string().optional().describe("Component name to analyze (optional - will scan all if not provided)"),
        workspacePath: z.string().describe("Workspace root path"),
      },
    },
    async (params: { componentName?: string; workspacePath: string }) => {
      const { componentName, workspacePath } = params;
      try {
        const pattern = componentName ? `**/*${componentName}*.{ts,tsx,js,jsx}` : "**/*.{tsx,jsx}";
        const files = await glob(pattern, { cwd: workspacePath, absolute: true, ignore: ["**/node_modules/**"] });
        
        let issues: any[] = [];
        
        for (const file of files.slice(0, 30)) {
          const content = await fs.readFile(file, 'utf-8');
          
          // Check for useEffect with API calls
          const effectPattern = /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\},\s*\[\s*\]\s*\)/g;
          let match;
          
          while ((match = effectPattern.exec(content)) !== null) {
            const effectBody = match[1];
            const lines = content.substring(0, match.index).split('\n').length;
            
            if (/fetch|axios|api\./i.test(effectBody)) {
              issues.push({
                type: 'API call in mount effect',
                file: path.basename(file),
                line: lines,
                severity: 'high'
              });
            }
          }
          
          // Check for StrictMode
          if (content.includes('React.StrictMode') || content.includes('<StrictMode>')) {
            issues.push({
              type: 'StrictMode enabled (double-mount)',
              file: path.basename(file),
              severity: 'info'
            });
          }
        }
        
        if (issues.length === 0) {
          return { content: [{ type: "text", text: "✅ No side effects detected" }] };
        }
        
        const high = issues.filter(i => i.severity === 'high');
        const output = `🔴 ${issues.length} potential issue(s) found\n\n${high.length > 0 ? '### High Severity:\n' + high.map((i, idx) => `${idx + 1}. ${i.type} in ${i.file}:${i.line}`).join('\n') : ''}`;
        
        return { content: [{ type: "text", text: output }] };
      } catch (error) {
        return { content: [{ type: "text", text: `❌ Error detecting side effects: ${error}` }] };
      }
    }
  );
}
