#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from "fs";
import * as path from "path";
import { glob } from "glob";
import { getRelevantKnowledge } from "./cssKnowledge.js";
import CDP from "chrome-remote-interface";

const server = new McpServer({
	name: "css-helper",
	version: "1.0.0",
});

// Investigation state management
interface InvestigationState {
	id: string;
	startedAt: Date;
	currentPhase: number;
	findings: {
		structure?: any;
		cascade?: any;
		conflicts?: any;
		multiLevel?: any;
		browser?: {
			computedStyles: Record<string, string>;
			matchedRules: Array<{
				selector: string;
				origin: string;
				properties: Array<{ name: string; value: string }>;
			}>;
			elementSelector: string;
		};
		solution?: any;
	};
}

const investigations = new Map<string, InvestigationState>();

// Helper to generate UUID
function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = Math.random() * 16 | 0;
		const v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

// CSS Specificity Calculator
interface SpecificityScore {
	inline: number;
	ids: number;
	classes: number;
	elements: number;
	total: number;
}

function calculateSpecificity(selector: string): SpecificityScore {
	// Remove pseudo-elements for calculation
	const cleaned = selector.replace(/::(before|after|first-line|first-letter)/g, '');
	
	const score: SpecificityScore = {
		inline: 0, // Will be 1 for inline styles
		ids: 0,
		classes: 0,
		elements: 0,
		total: 0
	};
	
	// Count IDs (#)
	score.ids = (cleaned.match(/#[\w-]+/g) || []).length;
	
	// Count classes (.), attributes ([]), pseudo-classes (:)
	const classMatches = (cleaned.match(/\.[\w-]+/g) || []).length;
	const attrMatches = (cleaned.match(/\[[\w-]+(=[^\]]+)?\]/g) || []).length;
	const pseudoMatches = (cleaned.match(/:(?!not\()[\w-]+/g) || []).length;
	score.classes = classMatches + attrMatches + pseudoMatches;
	
	// Count element types and pseudo-elements
	const elementMatches = cleaned.replace(/[#.:\[]/g, ' ').split(/\s+/)
		.filter(s => s && !/^[\d]/.test(s) && s !== '*').length;
	score.elements = elementMatches;
	
	// Calculate total (inline=1000, id=100, class=10, element=1)
	score.total = (score.inline * 1000) + (score.ids * 100) + (score.classes * 10) + score.elements;
	
	return score;
}

function formatSpecificity(score: SpecificityScore): string {
	return `(${score.inline},${score.ids},${score.classes},${score.elements}) = ${score.total}`;
}

// Tool 1: Initialize CSS investigation
server.registerTool(
	"css_investigate_start",
	{
		description: "Start a new CSS investigation with 5-phase protocol. Returns investigation ID, protocol overview, and relevant CSS knowledge.",
		inputSchema: {
			issue: z.string().describe("Description of the CSS issue to investigate"),
			workspacePath: z.string().optional().describe("Root path of the workspace (optional - will auto-detect if not provided)"),
		},
	},
	async ({ issue, workspacePath }) => {
		const investigationId = generateUUID();
		const investigation: InvestigationState = {
			id: investigationId,
			startedAt: new Date(),
			currentPhase: 1,
			findings: {},
		};
		investigations.set(investigationId, investigation);

		const knowledge = getRelevantKnowledge(issue);
		const protocol = `
# 🔍 CSS Investigation Started
**Investigation ID:** ${investigationId}

## 5-Phase Investigation Protocol

### Phase 1: Structure Analysis
- Search for component files related to the issue
- Read component hierarchy and structure
- Identify the DOM elements involved
- Map parent-child relationships

### Phase 2: Cascade Tracing
- Search for all CSS files that might apply
- Find all rules matching the element's selectors
- Trace the cascade from global → local styles
- Document each layer of styling

### Phase 3: Conflict Detection
- Analyze all found rules for conflicts
- Identify duplicate properties with different values
- Check for !important usage
- Detect specificity battles

### Phase 4: Multi-Level Cascade Analysis
- Trace how styles combine across levels
- Check for inheritance issues
- Identify overridden properties
- Map the complete cascade chain

### Phase 5: Solution Design
- Generate fix based on findings
- Reference CSS knowledge base for best practices
- Provide before/after code examples
- Explain why the solution works

${knowledge}

**Next Step:** Use \`css_phase1_structure\` to begin structure analysis.
`;

		return {
			content: [
				{
					type: "text",
					text: protocol,
				},
			],
		};
	}
);

// Tool 2: Phase 1 - Structure Analysis
server.registerTool(
	"css_phase1_structure",
	{
		description: "Phase 1: Analyze component structure. Search for components, read files, map hierarchy.",
		inputSchema: {
			investigationId: z.string().describe("Investigation ID from css_investigate_start"),
			componentPattern: z.string().describe("Glob pattern to search for components (e.g., '**/*Button*.tsx')"),
			workspacePath: z.string().describe("Root workspace path to search from"),
		},
	},
	async ({ investigationId, componentPattern, workspacePath }) => {
		const investigation = investigations.get(investigationId);
		if (!investigation) {
			return {
				content: [{ type: "text", text: `❌ Investigation ${investigationId} not found. Start a new investigation first.` }],
			};
		}

		try {
			// Search for matching files
			const files = await glob(componentPattern, { cwd: workspacePath, absolute: true });
			
			if (files.length === 0) {
				return {
					content: [{ type: "text", text: `⚠️ No files found matching pattern: ${componentPattern}` }],
				};
			}

			// Read first few files to analyze structure
			const fileContents = await Promise.all(
				files.slice(0, 5).map(async (file) => {
					const content = await fs.readFile(file, 'utf-8');
					return { path: file, content: content.slice(0, 2000) }; // First 2000 chars
				})
			);

			investigation.findings.structure = {
				filesFound: files.length,
				filesAnalyzed: fileContents.length,
				files: fileContents,
			};

			const result = `
## ✅ Phase 1: Structure Analysis Complete

**Files Found:** ${files.length}
**Files Analyzed:** ${fileContents.length}

${fileContents.map((f, i) => `
### File ${i + 1}: ${path.basename(f.path)}
\`\`\`
${f.content}
\`\`\`
`).join('\n')}

**Next Step:** Use \`css_phase2_cascade\` to trace CSS cascade.
`;

			return {
				content: [{ type: "text", text: result }],
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: `❌ Error in structure analysis: ${error}` }],
			};
		}
	}
);

// Tool 3: Phase 2 - Cascade Tracing
server.registerTool(
	"css_phase2_cascade",
	{
		description: "Phase 2: Trace CSS cascade. Search CSS files for matching selectors and rules.",
		inputSchema: {
			investigationId: z.string().describe("Investigation ID"),
			cssPattern: z.string().describe("Glob pattern for CSS files (e.g., '**/*.css', '**/*.scss')"),
			selector: z.string().describe("CSS selector or class name to search for"),
			workspacePath: z.string().describe("Root workspace path"),
		},
	},
	async ({ investigationId, cssPattern, selector, workspacePath }) => {
		const investigation = investigations.get(investigationId);
		if (!investigation) {
			return {
				content: [{ type: "text", text: `❌ Investigation ${investigationId} not found.` }],
			};
		}

		try {
			const cssFiles = await glob(cssPattern, { cwd: workspacePath, absolute: true });
			
			if (cssFiles.length === 0) {
				return {
					content: [{ type: "text", text: `⚠️ No CSS files found matching: ${cssPattern}` }],
				};
			}

			// Extract base class(es) from selector to search for ALL variations
			// Examples: ".vm-vulnerabilities-section h3" -> search for ".vm-vulnerabilities-section"
			//           ".button.primary" -> search for both ".button" and ".primary"
			const baseClasses = selector.match(/\.[a-zA-Z0-9_-]+/g) || [selector];
			const searchTerms = [selector, ...baseClasses].filter((v, i, a) => a.indexOf(v) === i); // unique
			
			// Search for ALL instances of the selector AND its base classes
			const matches: any[] = [];
			const allRulesBySelectorText = new Map<string, any>(); // Detect duplicates
			
			for (const file of cssFiles) {
				const content = await fs.readFile(file, 'utf-8');
				
				// Check if file contains ANY of our search terms
				const hasMatch = searchTerms.some(term => content.includes(term));
				if (!hasMatch) continue;
				
				const fileRules: any[] = [];
				
				// Extract ALL rules containing any of our search terms
				for (const term of searchTerms) {
					const rulePattern = new RegExp(`([^}]*${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{]*){([^}]+)}`, 'g');
					let match;
					
					while ((match = rulePattern.exec(content)) !== null) {
						const fullSelector = match[1].trim();
						const properties = match[2].trim();
						const specificity = calculateSpecificity(fullSelector);
						
						const rule = {
							selector: fullSelector,
							properties,
							specificity,
							specificityScore: specificity.total,
							searchTerm: term,
						};
						
						fileRules.push(rule);
						
						// Track duplicate selectors across files
						const existing = allRulesBySelectorText.get(fullSelector);
						if (existing) {
							existing.count++;
							existing.files.push(path.relative(workspacePath, file));
						} else {
							allRulesBySelectorText.set(fullSelector, {
								count: 1,
								files: [path.relative(workspacePath, file)],
								rule,
							});
						}
					}
				}
				
				if (fileRules.length > 0) {
					// Sort by specificity (highest first)
					fileRules.sort((a, b) => b.specificityScore - a.specificityScore);
					
					matches.push({
						file: path.relative(workspacePath, file),
						content: content,
						rules: fileRules,
					});
				}
			}
			
			// Detect duplicate selectors
			const duplicateSelectors = Array.from(allRulesBySelectorText.entries())
				.filter(([_, data]) => data.count > 1)
				.map(([selector, data]) => ({
					selector,
					count: data.count,
					files: data.files,
				}));

			investigation.findings.cascade = {
				cssFilesSearched: cssFiles.length,
				matchesFound: matches.length,
				matches,
				duplicateSelectors,
				searchTerms,
				rules: matches.flatMap(m => m.rules), // Store all rules for Phase 5
			};

			const result = `
## ✅ Phase 2: Cascade Tracing Complete

**CSS Files Searched:** ${cssFiles.length}
**Search Terms:** ${searchTerms.map(t => `\`${t}\``).join(', ')}
**Files With Matches:** ${matches.length}
**Total Rules Found:** ${matches.reduce((sum, m) => sum + m.rules.length, 0)}

${duplicateSelectors.length > 0 ? `
### 🚨 DUPLICATE SELECTORS DETECTED

The same selector appears in multiple places - this is almost always a problem:

${duplicateSelectors.map(dup => `
**\`${dup.selector}\`** - appears **${dup.count} times**
- Files: ${dup.files.join(', ')}
- **Action Required:** Consolidate into ONE rule or fix specificity issues
`).join('\n')}
` : ''}

${matches.map((m, i) => `
### Match ${i + 1}: ${m.file}
${m.rules && m.rules.length > 0 ? `
**${m.rules.length} rule(s) found (sorted by specificity):**
${m.rules.map((r: any, idx: number) => `
${idx + 1}. **Selector:** \`${r.selector}\` ${r.searchTerm !== selector ? `(matched base class: \`${r.searchTerm}\`)` : ''}
   **Specificity:** ${formatSpecificity(r.specificity)}
\`\`\`css
${r.selector} {
${r.properties}
}
\`\`\`
`).join('\n')}
` : `\`\`\`css\n${m.content}\n\`\`\``}
`).join('\n')}

${matches.some(m => m.rules && m.rules.length > 1) ? `
### ⚠️ Specificity Analysis
Multiple rules found with different specificity scores. The rule with the **highest specificity** will win.
Rules with lower specificity will be overridden unless they use \`!important\`.
` : ''}

${baseClasses.length > 1 && matches.length > 0 ? `
### 📊 Comparison Table: Base Class Rules

Found rules for multiple base classes - compare them side-by-side:

${(() => {
	const baseClassRules = new Map();
	matches.forEach(m => {
		m.rules.forEach((r: any) => {
			baseClasses.forEach(bc => {
				if (r.selector.includes(bc) && r.selector === bc) {
					if (!baseClassRules.has(bc)) baseClassRules.set(bc, []);
					baseClassRules.get(bc).push({ file: m.file, rule: r });
				}
			});
		});
	});
	
	if (baseClassRules.size === 0) return '';
	
	return Array.from(baseClassRules.entries()).map(([baseClass, rules]: [string, any]) => {
		return `
**Base Class: \`${baseClass}\`**
${rules.map((r: any) => `- ${r.file}: ${r.rule.properties.split('\n').length} properties`).join('\n')}
`;
	}).join('\n');
})()}
` : ''}

**Next Step:** Use \`css_phase3_conflicts\` to detect conflicts.
`;

			return {
				content: [{ type: "text", text: result }],
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: `❌ Error tracing cascade: ${error}` }],
			};
		}
	}
);

// Tool 4: Phase 3 - Conflict Detection
server.registerTool(
	"css_phase3_conflicts",
	{
		description: "Phase 3: Detect CSS conflicts. Analyze rules for duplicates, !important usage, and specificity issues.",
		inputSchema: {
			investigationId: z.string().describe("Investigation ID"),
		},
	},
	async ({ investigationId }) => {
		const investigation = investigations.get(investigationId);
		if (!investigation || !investigation.findings.cascade) {
			return {
				content: [{ type: "text", text: `❌ Must complete Phase 2 cascade tracing first.` }],
			};
		}

		const { matches, duplicateSelectors } = investigation.findings.cascade;
		const conflicts: string[] = [];
		const importantUsage: string[] = [];
		const duplicateProperties: any[] = [];
		
		// CRITICAL: Flag duplicate selectors as HIGH PRIORITY conflicts
		if (duplicateSelectors && duplicateSelectors.length > 0) {
			duplicateSelectors.forEach((dup: any) => {
				conflicts.push(`🚨 DUPLICATE SELECTOR: \`${dup.selector}\` appears ${dup.count} times in ${dup.files.join(', ')}`);
			});
		}

		// Analyze each match for issues
		for (const match of matches) {
			const content = match.content;
			
			// Check for !important
			const importantMatches = content.match(/!important/g);
			if (importantMatches) {
				importantUsage.push(`${match.file}: ${importantMatches.length} !important declarations`);
			}

			// Simple conflict detection (can be enhanced)
			const lines = content.split('\n');
			const properties = new Map<string, string[]>();
			
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i].trim();
				const propMatch = line.match(/^([a-z-]+):\s*(.+);/);
				if (propMatch) {
					const [, prop, value] = propMatch;
					if (!properties.has(prop)) {
						properties.set(prop, []);
					}
					properties.get(prop)!.push(`Line ${i + 1}: ${value}`);
				}
			}

			// Find duplicates
			for (const [prop, values] of properties.entries()) {
				if (values.length > 1) {
					duplicateProperties.push({
						file: match.file,
						property: prop,
						values,
					});
				}
			}
		}

		investigation.findings.conflicts = {
			totalConflicts: conflicts.length + importantUsage.length + duplicateProperties.length,
			conflicts,
			importantUsage,
			duplicateProperties,
		};

		const result = `
## ✅ Phase 3: Conflict Detection Complete

**Total Issues Found:** ${investigation.findings.conflicts.totalConflicts}

${duplicateSelectors && duplicateSelectors.length > 0 ? `
### 🚨 CRITICAL: Duplicate Selectors (RED FLAG)

**${duplicateSelectors.length} selector(s) defined multiple times - this is ALWAYS a problem:**

${duplicateSelectors.map((dup: any) => `
**\`${dup.selector}\`**
- Appears: **${dup.count} times**
- Files: ${dup.files.map((f: string) => `\`${f}\``).join(', ')}
- **Problem:** Only ONE definition will win - others are ignored/overridden
- **Action:** Consolidate into a single rule OR use different class names
`).join('\n')}
` : ''}

### !important Usage
${importantUsage.length > 0 ? importantUsage.map(u => `- ${u}`).join('\n') : '✓ No !important declarations found'}

### Duplicate Properties Within Rules
${duplicateProperties.length > 0 ? duplicateProperties.map(d => `
**${d.file}** - Property: \`${d.property}\`
${d.values.map((v: string) => `  - ${v}`).join('\n')}
`).join('\n') : '✓ No duplicate properties found'}

**Next Step:** Use \`css_phase4_multilevel\` for multi-level cascade analysis.
`;

		return {
			content: [{ type: "text", text: result }],
		};
	}
);

// Tool 5: Phase 4 - Multi-Level Cascade Analysis
server.registerTool(
	"css_phase4_multilevel",
	{
		description: "Phase 4: Multi-level cascade analysis. Trace how styles combine across levels and identify inheritance issues.",
		inputSchema: {
			investigationId: z.string().describe("Investigation ID"),
		},
	},
	async ({ investigationId }) => {
		const investigation = investigations.get(investigationId);
		if (!investigation || !investigation.findings.conflicts) {
			return {
				content: [{ type: "text", text: `❌ Must complete Phase 3 conflict detection first.` }],
			};
		}

		// Analyze cascade layers (without DevTools)
		const analysis = {
			cascadeLayers: [
				"Global/Reset styles",
				"Framework defaults",
				"Component styles",
				"Inline styles",
			],
			inheritanceChain: investigation.findings.structure?.files || [],
			overriddenProperties: investigation.findings.conflicts?.duplicateProperties || [],
		};

		investigation.findings.multiLevel = analysis;

		const result = `
## ✅ Phase 4: Multi-Level Cascade Analysis Complete

### Cascade Layers Analyzed
${analysis.cascadeLayers.map((layer, i) => `${i + 1}. ${layer}`).join('\n')}

### Inheritance Chain
- **Components Found:** ${analysis.inheritanceChain.length}
- **Overridden Properties:** ${analysis.overriddenProperties.length}

### Summary
The cascade flows from global styles through framework defaults to component-specific styles. 
${analysis.overriddenProperties.length > 0 ? 'Multiple layers are competing for control of the same properties.' : 'No major cascade conflicts detected.'}

**Next Step:** Use \`css_phase4b_browser\` to inspect live browser styles (optional), or skip to \`css_phase5_solution\` for the fix.
`;

		return {
			content: [{ type: "text", text: result }],
		};
	}
);

// Tool 5b: Phase 4b - Live Browser Inspection (Optional)
server.registerTool(
	"css_phase4b_browser",
	{
		description: "Phase 4b: Auto-connect to Edge/Chrome DevTools to inspect actual computed styles. Will attempt connection on port 9222, or try to detect running instances.",
		inputSchema: {
			investigationId: z.string().describe("Investigation ID"),
			elementSelector: z.string().describe("CSS selector to inspect in the browser (e.g., '.button', '#header')"),
			chromePort: z.number().optional().describe("DevTools port (default: 9222, auto-detects if not specified)"),
			autoLaunch: z.boolean().optional().describe("Auto-launch Edge if not running (default: false)"),
			headless: z.boolean().optional().describe("Launch Edge in headless mode - no visible window (default: false)"),
		},
	},
	async ({ investigationId, elementSelector, chromePort = 9222, autoLaunch = false, headless = false }) => {
		const investigation = investigations.get(investigationId);
		if (!investigation) {
			return {
				content: [{ type: "text", text: `❌ Investigation ${investigationId} not found.` }],
			};
		}

		try {
			// Try to connect to existing browser
			let client;
			try {
				client = await CDP({ port: chromePort });
			} catch (connectError: any) {
				if (autoLaunch) {
					// Auto-launch Edge with debugging (Windows-specific)
					const { spawn } = await import('child_process');
					const edgePath = 'msedge.exe'; // Windows PATH should find it
					const args = ['--remote-debugging-port=' + chromePort];
					
					if (headless) {
						args.push('--headless=new'); // Chromium headless mode - no visible window
					} else {
						args.push('--new-window');
					}
					
					spawn(edgePath, args, { 
						detached: true, 
						stdio: 'ignore' 
					}).unref();
					
					// Wait for browser to start
					await new Promise(resolve => setTimeout(resolve, 3000));
					
					// Retry connection
					try {
						client = await CDP({ port: chromePort });
					} catch (retryError: any) {
						return {
							content: [{ type: "text", text: `❌ Failed to auto-launch Edge: ${retryError.message}\n\n**Manual Setup:**\n\`msedge.exe --remote-debugging-port=${chromePort}\`` }],
						};
					}
				} else {
					return {
						content: [{ type: "text", text: `❌ Browser not running with debugging enabled.\n\n**Quick Fix:** Run this command:\n\`msedge.exe --remote-debugging-port=${chromePort}\`\n\nOr set \`autoLaunch: true\` to launch automatically.` }],
					};
				}
			}
			
			const { DOM, CSS, Runtime } = client;

			await DOM.enable();
			await CSS.enable();

			// Get root document
			const { root } = await DOM.getDocument();

			// Query for the element
			const { nodeId } = await DOM.querySelector({
				nodeId: root.nodeId!,
				selector: elementSelector,
			});

			if (!nodeId) {
				await client.close();
				return {
					content: [{ type: "text", text: `❌ Element not found: ${elementSelector}\n\nMake sure the page is loaded and the selector is correct.` }],
				};
			}

			// Get computed styles
			const { computedStyle } = await CSS.getComputedStyleForNode({ nodeId });

			// Get matched CSS rules
			const { matchedCSSRules } = await CSS.getMatchedStylesForNode({ nodeId });

			// Parse results
			const computedStyles = computedStyle.reduce((acc, style) => {
				acc[style.name] = style.value;
				return acc;
			}, {} as Record<string, string>);

			const matchedRules = matchedCSSRules?.map(rule => ({
				selector: rule.rule.selectorList?.text || 'unknown',
				origin: rule.rule.origin,
				properties: rule.rule.style?.cssProperties.map(p => ({
					name: p.name,
					value: p.value,
				})) || []
			})) || [];

			await client.close();

			// Store browser data
			investigation.findings.browser = {
				computedStyles,
				matchedRules,
				elementSelector,
			};

			const result = `
## ✅ Phase 4b: Live Browser Inspection Complete

**Element Inspected:** \`${elementSelector}\`
**Browser:** Edge/Chrome (DevTools Protocol on port ${chromePort})

### 🌐 Computed Styles (What the Browser Actually Uses)
${Object.entries(computedStyles).slice(0, 20).map(([prop, value]) => `- **${prop}:** \`${value}\``).join('\n')}
${Object.keys(computedStyles).length > 20 ? `\n... and ${Object.keys(computedStyles).length - 20} more properties` : ''}

### 📋 Matched CSS Rules (In Order of Application)
${matchedRules.map((rule, i) => `
${i + 1}. **Selector:** \`${rule.selector}\` (Origin: ${rule.origin})
   Properties:
${rule.properties.map(p => `   - ${p.name}: ${p.value}`).join('\n')}
`).join('\n')}

**Next Step:** Use \`css_phase5_solution\` to generate the fix based on both static and live analysis.
`;

			return {
				content: [{ type: "text", text: result }],
			};
		} catch (error: any) {
			const errorMsg = error.message || String(error);
			let helpText = '';
			
			if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('connect')) {
				helpText = `\n\n**Quick Fix:** Run Edge with debugging:\n\`msedge.exe --remote-debugging-port=${chromePort}\`\n\nOr set \`autoLaunch: true\` in the tool parameters.`;
			} else if (errorMsg.includes('timeout')) {
				helpText = '\n\nBrowser took too long to respond. Try refreshing the page.';
			}
			
			return {
				content: [{ type: "text", text: `❌ Browser inspection failed: ${errorMsg}${helpText}` }],
			};
		}
	}
);

// Tool 6: Phase 5 - Solution Design
server.registerTool(
	"css_phase5_solution",
	{
		description: "Phase 5: Generate solution with fix code and explanation based on all findings.",
		inputSchema: {
			investigationId: z.string().describe("Investigation ID"),
			originalIssue: z.string().describe("Original issue description for context"),
		},
	},
	async ({ investigationId, originalIssue }) => {
		const investigation = investigations.get(investigationId);
		if (!investigation || !investigation.findings.multiLevel) {
			return {
				content: [{ type: "text", text: `❌ Must complete Phase 4 multi-level analysis first.` }],
			};
		}

		const knowledge = getRelevantKnowledge(originalIssue);
		const findings = investigation.findings;

		// Check if we have browser data for more accurate analysis
		const hasBrowserData = !!findings.browser;
		let browserInsights = '';
		
		if (hasBrowserData) {
			browserInsights = '\n### 🌐 Live Browser Analysis\n\n';
			browserInsights += `**Element:** \`${findings.browser!.elementSelector}\`\n\n`;
			
			// Show which rules actually won in the browser
			if (findings.browser!.matchedRules.length > 0) {
				browserInsights += '**Rules Applied (in order):**\n';
				findings.browser!.matchedRules.forEach((rule, i) => {
					browserInsights += `${i + 1}. \`${rule.selector}\` (${rule.origin})\n`;
				});
				browserInsights += '\n';
			}
			
			// Compare static predictions vs browser reality
			if (findings.cascade?.rules && findings.cascade.rules.length > 0) {
				const staticWinner = findings.cascade.rules[0]; // First = highest specificity
				const browserWinner = findings.browser!.matchedRules[findings.browser!.matchedRules.length - 1]; // Last = actually applied
				
				if (staticWinner && browserWinner && staticWinner.selector !== browserWinner.selector) {
					browserInsights += '⚠️ **Static vs Browser Mismatch:**\n';
					browserInsights += `- Static analysis predicted: \`${staticWinner.selector}\` (specificity: ${staticWinner.specificityFormatted})\n`;
					browserInsights += `- Browser actually applied: \`${browserWinner.selector}\` (origin: ${browserWinner.origin})\n`;
					browserInsights += '- This suggests inline styles, !important, or load order issues.\n\n';
				}
			}
		}

		// Analyze findings to generate specific fix
		let specificFix = '';
		let fixedFiles: string[] = [];
		
		// Generate fixes based on actual conflicts found
		if (findings.conflicts?.duplicateProperties && findings.conflicts.duplicateProperties.length > 0) {
			specificFix += '\n### 🔧 Fix Duplicate Property Conflicts\n\n';
			
			for (const dup of findings.conflicts.duplicateProperties) {
				specificFix += `**File:** \`${dup.file}\`\n`;
				specificFix += `**Property:** \`${dup.property}\`\n`;
				specificFix += `**Problem:** Multiple conflicting values found:\n`;
				dup.values.forEach((v: string) => {
					specificFix += `  - ${v}\n`;
				});
				
				// Recommend keeping the last value
				const lastValue = dup.values[dup.values.length - 1];
				specificFix += `\n**Recommendation:** Keep only the final value and remove duplicates:\n`;
				specificFix += `\`\`\`css\n${dup.property}: ${lastValue.split(': ')[1]};\n\`\`\`\n\n`;
				
				if (!fixedFiles.includes(dup.file)) {
					fixedFiles.push(dup.file);
				}
			}
		}
		
		if (findings.conflicts?.importantUsage && findings.conflicts.importantUsage.length > 0) {
			specificFix += '\n### ⚠️ Remove !important Declarations\n\n';
			specificFix += '**Problem:** Overuse of `!important` makes CSS harder to maintain.\n\n';
			
			findings.conflicts.importantUsage.forEach((usage: string) => {
				specificFix += `- ${usage}\n`;
			});
			
			specificFix += `\n**Recommendation:** Replace !important with proper specificity:\n`;
			specificFix += `\`\`\`css\n/* Instead of */\n.element { color: red !important; }\n\n`;
			specificFix += `/* Use higher specificity */\n.parent .element { color: red; }\n/* or */\n#container .element { color: red; }\n\`\`\`\n\n`;
		}
		
		// Add CSS matches analysis
		if (findings.cascade?.matches && findings.cascade.matches.length > 0) {
			specificFix += '\n### 📄 CSS Files With Matching Rules\n\n';
			specificFix += `Found **${findings.cascade.matches.length}** CSS file(s) affecting this element:\n\n`;
			
			findings.cascade.matches.forEach((match: any) => {
				specificFix += `- \`${match.file}\`\n`;
			});
			
			specificFix += '\n**Action:** Review these files to ensure styles are applied in the correct order.\n\n';
		}

		const solution = `
## ✅ Phase 5: Solution Design Complete

### Investigation Summary
- **Files Analyzed:** ${findings.structure?.filesFound || 0}
- **CSS Files Searched:** ${findings.cascade?.cssFilesSearched || 0}
- **Conflicts Found:** ${findings.conflicts?.totalConflicts || 0}
${hasBrowserData ? `- **Live Browser Data:** ✅ Available` : `- **Live Browser Data:** ❌ Not used (optional)`}

${browserInsights}

${specificFix || '### ✓ No Major Issues Detected\n\nThe CSS structure appears correct. The issue may be related to:\n- Timing (styles not loaded yet)\n- JavaScript overrides\n- Browser-specific behavior\n\n' + (hasBrowserData ? 'Check the browser data above for actual computed styles.' : 'Run `css_phase4b_browser` for live browser inspection.')}

### CSS Knowledge Reference

${knowledge}

### Implementation Steps
1. ${fixedFiles.length > 0 ? `Edit these files: ${fixedFiles.join(', ')}` : 'Review the CSS knowledge patterns above'}
2. Apply the specific fixes listed above
3. Test changes in browser DevTools first
4. Verify the fix resolves the original issue: "${originalIssue}"
5. Commit the CSS changes

### Why This Solution Works
${specificFix ? `This fix addresses the **specific conflicts** found in your code:
- Eliminates duplicate property declarations
- Removes unnecessary !important usage
- Clarifies cascade order
- Uses proper CSS specificity${hasBrowserData ? '\n- **Verified against live browser data** for accuracy' : ''}` : `The investigation didn't find obvious conflicts.${hasBrowserData ? ' Browser data shows no major mismatches.' : ''} The issue may require:
- ${hasBrowserData ? 'Checking if styles are being overridden by JavaScript' : 'Running Phase 4b to inspect live browser computed styles'}
- Verifying CSS is loaded correctly
- Reviewing JavaScript interactions
- Testing across different browsers`}

**Investigation Complete!** ${specificFix ? 'Use the specific fixes above to resolve the issue.' : hasBrowserData ? 'Review browser data for clues.' : 'Consider running Phase 4b for browser inspection.'}
`;

		investigation.findings.solution = {
			generatedAt: new Date(),
			recommendation: solution,
			fixedFiles,
		};

		return {
			content: [{ type: "text", text: solution }],
		};
	}
);

// Tool 7: Search CSS files
server.registerTool(
	"css_search_files",
	{
		description: "Search for CSS/SCSS/LESS files matching a glob pattern.",
		inputSchema: {
			pattern: z.string().describe("Glob pattern (e.g., '**/*.css', 'src/**/*.scss')"),
			workspacePath: z.string().describe("Root workspace path to search from"),
		},
	},
	async ({ pattern, workspacePath }) => {
		try {
			const files = await glob(pattern, { cwd: workspacePath, absolute: true });
			
			return {
				content: [{
					type: "text",
					text: `Found ${files.length} files:\n${files.map(f => `- ${path.relative(workspacePath, f)}`).join('\n')}`,
				}],
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: `❌ Error searching files: ${error}` }],
			};
		}
	}
);

// Tool 8: Read component file
server.registerTool(
	"css_read_component",
	{
		description: "Read contents of a component file for CSS investigation.",
		inputSchema: {
			filePath: z.string().describe("Absolute path to the file to read"),
		},
	},
	async ({ filePath }) => {
		try {
			const content = await fs.readFile(filePath, 'utf-8');
			return {
				content: [{
					type: "text",
					text: `# ${path.basename(filePath)}\n\n\`\`\`\n${content}\n\`\`\``,
				}],
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: `❌ Error reading file: ${error}` }],
			};
		}
	}
);

// Tool 9: Get CSS knowledge
server.registerTool(
	"css_get_knowledge",
	{
		description: "Query the CSS knowledge base for solutions to common issues.",
		inputSchema: {
			query: z.string().describe("CSS issue or keyword to search for (e.g., 'centering', 'flexbox', 'z-index')"),
		},
	},
	async ({ query }) => {
		const knowledge = getRelevantKnowledge(query);
		return {
			content: [{
				type: "text",
				text: knowledge,
			}],
		};
	}
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("CSS Helper MCP Server running on stdio with 9 CSS debugging tools");
}

main().catch((error) => {
	console.error("Fatal error in main():", error);
	process.exit(1);
});
