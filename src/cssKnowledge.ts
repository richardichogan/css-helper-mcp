// CSS Knowledge Base - Common issues, solutions, and framework defaults
// This gets injected into prompts to enhance CSS debugging

export interface CSSIssue {
	problem: string;
	commonCauses: string[];
	solution: string;
	example: string;
}

export interface FrameworkDefaults {
	[key: string]: {
		[component: string]: Record<string, string>;
	};
}

/**
 * Common CSS issues and their solutions
 */
export const CSS_COMMON_ISSUES: Record<string, CSSIssue> = {
	centering: {
		problem: "Element not centered horizontally or vertically",
		commonCauses: [
			"Parent container missing display: flex or display: grid",
			"Missing justify-content: center or align-items: center on flex parent",
			"Using margin: auto on inline element (needs display: block)",
			"Text-align: center only works for inline/inline-block content",
			"Absolute positioning without transform: translate",
			"Parent has no defined height for vertical centering"
		],
		solution: `
**Flexbox Approach (Recommended):**
.parent {
  display: flex;
  justify-content: center;  /* horizontal */
  align-items: center;      /* vertical */
  min-height: 100vh;       /* or specific height */
}

**Grid Approach:**
.parent {
  display: grid;
  place-items: center;     /* centers both ways */
  min-height: 100vh;
}

**Absolute Positioning:**
.parent { position: relative; }
.child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}`,
		example: "Icon in container not centered despite margin: auto"
	},

	zIndex: {
		problem: "z-index property not taking effect",
		commonCauses: [
			"Element missing position property (must be relative, absolute, or fixed)",
			"Parent element has lower z-index creating new stacking context",
			"Elements in different stacking contexts (can't compare z-index)",
			"Using z-index on static positioned element",
			"Parent has transform, filter, or opacity creating stacking context"
		],
		solution: `
**Fix z-index issues:**
.element {
  position: relative;    /* or absolute/fixed */
  z-index: 10;          /* now it will work */
}

**Check stacking context:**
- Parent with transform/filter/opacity creates new context
- z-index only compares within same stacking context
- Use dev tools to inspect stacking order`,
		example: "Modal overlay not appearing above content despite z-index: 9999"
	},

	flexbox: {
		problem: "Flexbox layout not behaving as expected",
		commonCauses: [
			"Parent missing display: flex declaration",
			"flex-wrap: nowrap preventing items from wrapping",
			"flex-basis conflicting with width/height properties",
			"min-width/min-height preventing flex items from shrinking",
			"Incorrect flex-direction for desired layout",
			"Nested flex containers with conflicting properties",
			"margin: auto on flex item overriding alignment"
		],
		solution: `
**Common fixes:**
.container {
  display: flex;
  flex-wrap: wrap;        /* allow wrapping */
  gap: 1rem;             /* spacing between items */
}

.item {
  flex: 1 1 auto;        /* grow | shrink | basis */
  min-width: 0;          /* allow shrinking below content size */
}`,
		example: "Flex items not wrapping despite container overflow"
	},

	grid: {
		problem: "CSS Grid not creating expected layout",
		commonCauses: [
			"Missing grid-template-columns or grid-template-rows",
			"Implicit grid creating unexpected rows/columns",
			"grid-auto-flow not set correctly",
			"Items spanning wrong number of tracks",
			"Gap/gutter not accounting for total width",
			"Minmax() creating overflow issues"
		],
		solution: `
**Basic grid setup:**
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);  /* 3 equal columns */
  gap: 1rem;
}

**Responsive grid:**
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}`,
		example: "Grid items not filling container width"
	},

	overflow: {
		problem: "Content overflowing container or being cut off",
		commonCauses: [
			"Parent has overflow: hidden hiding content",
			"Fixed width/height too small for content",
			"Text not wrapping (missing word-wrap or overflow-wrap)",
			"Whitespace: nowrap preventing text wrap",
			"Flexbox min-width default preventing shrink",
			"Position: absolute taking element out of flow"
		],
		solution: `
**Handle text overflow:**
.container {
  overflow-wrap: break-word;
  word-break: break-word;
}

**Scrollable container:**
.container {
  overflow: auto;
  max-height: 400px;
}

**Flex item overflow:**
.flex-item {
  min-width: 0;    /* allows shrinking */
  overflow: hidden;
}`,
		example: "Long text breaking layout instead of wrapping"
	},

	specificity: {
		problem: "CSS rules not applying despite being defined",
		commonCauses: [
			"More specific selector overriding your styles",
			"!important in another rule taking precedence",
			"CSS loaded in wrong order (later styles win)",
			"Inline styles overriding stylesheet rules",
			"Framework/library styles with higher specificity",
			"Scoped styles not reaching target element"
		],
		solution: `
**Specificity hierarchy (low to high):**
1. Element selectors: div, p
2. Class selectors: .classname
3. ID selectors: #idname
4. Inline styles: style="..."
5. !important (use sparingly)

**Debugging:**
- Use DevTools to see which rule wins
- Check "Computed" tab for final values
- Increase specificity: .parent .child
- Avoid !important unless necessary`,
		example: "Button color not changing despite CSS rule"
	},

	positioning: {
		problem: "Element positioning not working as expected",
		commonCauses: [
			"Static positioning (default) ignoring top/left/right/bottom",
			"Relative positioning but parent not positioned",
			"Absolute positioning without positioned ancestor (positions to viewport)",
			"Fixed positioning creating unexpected scroll behavior",
			"Sticky positioning not working (needs threshold and scrollable parent)",
			"Transform creating new positioning context"
		],
		solution: `
**Position values:**
.parent { position: relative; }  /* creates positioning context */

.child-absolute {
  position: absolute;
  top: 0; left: 0;              /* positions to nearest positioned ancestor */
}

.child-fixed {
  position: fixed;
  top: 0; left: 0;              /* positions to viewport */
}

.child-sticky {
  position: sticky;
  top: 20px;                    /* sticks when scrolling */
}`,
		example: "Absolutely positioned element not staying within parent"
	},

	responsive: {
		problem: "Layout breaking on different screen sizes",
		commonCauses: [
			"Using fixed pixel widths instead of relative units",
			"Missing viewport meta tag in HTML",
			"Media queries not covering all breakpoints",
			"Images not responsive (missing max-width: 100%)",
			"Fixed font sizes instead of responsive units",
			"Overflow causing horizontal scroll on mobile"
		],
		solution: `
**Responsive basics:**
/* Use relative units */
.container {
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
}

/* Responsive images */
img {
  max-width: 100%;
  height: auto;
}

/* Fluid typography */
body {
  font-size: clamp(1rem, 2.5vw, 1.25rem);
}

/* Media queries */
@media (max-width: 768px) {
  .container { flex-direction: column; }
}`,
		example: "Layout looks good on desktop but breaks on mobile"
	}
};

/**
 * Framework-specific default styles that often cause issues
 */
export const FRAMEWORK_DEFAULTS: FrameworkDefaults = {
	materialUI: {
		Button: {
			padding: "6px 16px",
			minWidth: "64px",
			borderRadius: "4px",
			textTransform: "uppercase"
		},
		Card: {
			padding: "16px",
			boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2)"
		},
		TextField: {
			marginTop: "16px",
			marginBottom: "8px"
		},
		Dialog: {
			padding: "24px"
		}
	},
	
	reactFlow: {
		Node: {
			padding: "10px",
			minWidth: "150px",
			borderRadius: "3px",
			border: "1px solid #1a192b"
		},
		Edge: {
			strokeWidth: "1px"
		}
	},

	tailwind: {
		spacing: {
			unit: "0.25rem",
			description: "Each spacing unit is 0.25rem (4px)"
		},
		container: {
			padding: "1rem",
			maxWidth: "varies by breakpoint"
		}
	},

	bootstrap: {
		container: {
			padding: "15px",
			marginLeft: "auto",
			marginRight: "auto"
		},
		row: {
			marginLeft: "-15px",
			marginRight: "-15px"
		},
		col: {
			padding: "15px"
		}
	},

	antDesign: {
		Button: {
			padding: "4px 15px",
			height: "32px",
			fontSize: "14px"
		},
		Card: {
			padding: "24px"
		}
	},

	carbonDesign: {
		Button: {
			minHeight: "48px",
			padding: "14px 64px 14px 16px"
		}
	}
};

/**
 * CSS best practices and performance tips
 */
export const CSS_BEST_PRACTICES = {
	performance: [
		"Avoid deep selector nesting (>3 levels)",
		"Use class selectors over complex attribute selectors",
		"Minimize use of expensive properties (box-shadow, filter, transform)",
		"Use will-change sparingly (only for animations)",
		"Avoid * universal selector for performance",
		"Use contain: layout for isolated components"
	],
	
	maintainability: [
		"Use CSS custom properties (variables) for theming",
		"Follow BEM or consistent naming convention",
		"Keep selectors scoped to components",
		"Document complex calculations or hacks",
		"Use logical properties (margin-inline-start vs margin-left)",
		"Group related properties together"
	],
	
	accessibility: [
		"Ensure sufficient color contrast (4.5:1 minimum)",
		"Don't rely solely on color to convey information",
		"Make focus indicators visible",
		"Use rem/em for font sizes (respects user preferences)",
		"Avoid fixed heights that may cut off zoomed text",
		"Test with screen readers and keyboard navigation"
	]
};

/**
 * Get relevant CSS knowledge based on issue keywords
 */
export function getRelevantKnowledge(userMessage: string): string {
	const message = userMessage.toLowerCase();
	let knowledge = "\n# 📚 Relevant CSS Knowledge\n\n";
	
	// Check for specific issue keywords
	const issueMatches: string[] = [];
	
	if (message.includes('center') || message.includes('centering')) {
		issueMatches.push('centering');
	}
	if (message.includes('z-index') || message.includes('stack') || message.includes('layer')) {
		issueMatches.push('zIndex');
	}
	if (message.includes('flex') || message.includes('flexbox')) {
		issueMatches.push('flexbox');
	}
	if (message.includes('grid')) {
		issueMatches.push('grid');
	}
	if (message.includes('overflow') || message.includes('scroll') || message.includes('clip')) {
		issueMatches.push('overflow');
	}
	if (message.includes('specific') || message.includes('not apply') || message.includes('override')) {
		issueMatches.push('specificity');
	}
	if (message.includes('position') || message.includes('absolute') || message.includes('relative')) {
		issueMatches.push('positioning');
	}
	if (message.includes('responsive') || message.includes('mobile') || message.includes('breakpoint')) {
		issueMatches.push('responsive');
	}
	
	// Add matched issues
	if (issueMatches.length > 0) {
		knowledge += "## Common Issues Detected\n\n";
		for (const key of issueMatches) {
			const issue = CSS_COMMON_ISSUES[key];
			if (issue) {
				knowledge += formatIssue(key, issue);
			}
		}
	}
	
	// Check for framework mentions
	const frameworks: string[] = [];
	if (message.includes('material') || message.includes('mui')) {
		frameworks.push('materialUI');
	}
	if (message.includes('react flow') || message.includes('reactflow')) {
		frameworks.push('reactFlow');
	}
	if (message.includes('tailwind')) {
		frameworks.push('tailwind');
	}
	if (message.includes('bootstrap')) {
		frameworks.push('bootstrap');
	}
	if (message.includes('ant design') || message.includes('antd')) {
		frameworks.push('antDesign');
	}
	if (message.includes('carbon')) {
		frameworks.push('carbonDesign');
	}
	
	if (frameworks.length > 0) {
		knowledge += "\n## Framework Defaults\n\n";
		for (const fw of frameworks) {
			knowledge += formatFramework(fw, FRAMEWORK_DEFAULTS[fw]);
		}
	}
	
	return knowledge;
}

function formatIssue(name: string, issue: CSSIssue): string {
	return `### ${name.charAt(0).toUpperCase() + name.slice(1)}
**Problem:** ${issue.problem}

**Common Causes:**
${issue.commonCauses.map(c => `- ${c}`).join('\n')}

${issue.solution}

`;
}

function formatFramework(name: string, defaults: any): string {
	let output = `### ${name}\n`;
	for (const [component, styles] of Object.entries(defaults)) {
		output += `**${component}:**\n`;
		for (const [prop, value] of Object.entries(styles as Record<string, string>)) {
			output += `  - ${prop}: ${value}\n`;
		}
	}
	return output + '\n';
}
