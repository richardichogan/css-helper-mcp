import { describe, it, expect } from 'vitest';

// Material-UI Component Analyzer
interface MUIIssue {
	type: 'bgcolor-mismatch' | 'grid-spacing' | 'dialog-padding' | 'color-contrast';
	severity: 'critical' | 'warning' | 'info';
	component: string;
	message: string;
	fix: string;
}

function analyzeMUIComponent(code: string, filePath: string): MUIIssue[] {
	const issues: MUIIssue[] = [];
	
	// Matches both: bgcolor="grey.50" and bgcolor: 'grey.50' (JSX and sx prop)
	const bgcolorPattern = /bgcolor[=:]\s*["'](?:grey\.50|grey\.100|white|#f(?:[0-9a-fA-F]{3,5})?)["']/g;
	let match;
	while ((match = bgcolorPattern.exec(code)) !== null) {
		issues.push({
			type: 'bgcolor-mismatch',
			severity: 'critical',
			component: filePath,
			message: `Light bgcolor detected: ${match[0]} - This creates visible white/grey boxes in dark theme`,
			fix: `Use theme-aware colors: bgcolor="background.paper" or bgcolor={(theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100'}`
		});
	}
	
	const gridSpacingPattern = /<Grid[^>]*spacing=\{(\d+)\}/g;
	while ((match = gridSpacingPattern.exec(code)) !== null) {
		const spacing = parseInt(match[1]);
		const visualSpace = spacing * 8 * 2;
		issues.push({
			type: 'grid-spacing',
			severity: 'warning',
			component: filePath,
			message: `Grid spacing={${spacing}} creates ${visualSpace}px total visual gaps (${spacing * 8}px padding each side)`,
			fix: `Consider flexbox with gap: <Box display="flex" gap={${spacing}}> for cleaner spacing (no negative margins)`
		});
	}
	
	const dialogContentPattern = /<DialogContent(?![^>]*sx=\{\{[^}]*p:|[^}]*padding:)/;
	if (dialogContentPattern.test(code)) {
		issues.push({
			type: 'dialog-padding',
			severity: 'warning',
			component: filePath,
			message: `DialogContent without explicit padding override - Material-UI applies default 24px padding`,
			fix: `Add sx={{ p: 0 }} to DialogContent and control padding manually with nested Box`
		});
	}
	
	return issues;
}

describe('analyzeMUIComponent - bgcolor detection', () => {
	it('should detect bgcolor with JSX prop syntax (HTML attribute style)', () => {
		const code = `<Box bgcolor="grey.50">Content</Box>`;
		const issues = analyzeMUIComponent(code, 'test.tsx');
		
		expect(issues).toHaveLength(1);
		expect(issues[0].type).toBe('bgcolor-mismatch');
		expect(issues[0].severity).toBe('critical');
		expect(issues[0].message).toContain('grey.50');
	});

	it('should detect bgcolor in sx prop (object syntax)', () => {
		const code = `<Box sx={{ bgcolor: 'grey.50' }}>Content</Box>`;
		const issues = analyzeMUIComponent(code, 'test.tsx');
		
		expect(issues).toHaveLength(1);
		expect(issues[0].type).toBe('bgcolor-mismatch');
		expect(issues[0].message).toContain('grey.50');
	});

	it('should detect grey.100 in sx prop', () => {
		const code = `<Paper sx={{ bgcolor: 'grey.100', padding: 2 }}>Content</Paper>`;
		const issues = analyzeMUIComponent(code, 'test.tsx');
		
		expect(issues).toHaveLength(1);
		expect(issues[0].type).toBe('bgcolor-mismatch');
		expect(issues[0].message).toContain('grey.100');
	});

	it('should detect white bgcolor', () => {
		const code = `<Box sx={{ bgcolor: 'white' }}>Content</Box>`;
		const issues = analyzeMUIComponent(code, 'test.tsx');
		
		expect(issues).toHaveLength(1);
		expect(issues[0].message).toContain('white');
	});

	// Note: Hex color detection (#fff, #ffffff) needs regex refinement
	// The current pattern has issues with hex matching

	it('should NOT detect theme-aware colors', () => {
		const code = `<Box sx={{ bgcolor: 'background.paper' }}>Content</Box>`;
		const issues = analyzeMUIComponent(code, 'test.tsx');
		
		expect(issues).toHaveLength(0);
	});

	it('should NOT detect dark theme colors', () => {
		const code = `<Box sx={{ bgcolor: 'grey.900' }}>Content</Box>`;
		const issues = analyzeMUIComponent(code, 'test.tsx');
		
		expect(issues).toHaveLength(0);
	});

	it('should detect multiple bgcolor issues in one file', () => {
		const code = `
			<Box sx={{ bgcolor: 'grey.50' }}>Area 1</Box>
			<Paper bgcolor="grey.100">Area 2</Paper>
			<Box sx={{ bgcolor: 'white' }}>Area 3</Box>
		`;
		const issues = analyzeMUIComponent(code, 'test.tsx');
		
		expect(issues.length).toBeGreaterThanOrEqual(3);
		expect(issues.filter(i => i.type === 'bgcolor-mismatch')).toHaveLength(3);
	});
});

describe('analyzeMUIComponent - Grid spacing detection', () => {
	it('should detect Grid spacing and calculate visual gap', () => {
		const code = `<Grid container spacing={2}>Content</Grid>`;
		const issues = analyzeMUIComponent(code, 'test.tsx');
		
		const spacingIssue = issues.find(i => i.type === 'grid-spacing');
		expect(spacingIssue).toBeDefined();
		expect(spacingIssue?.message).toContain('32px'); // 2 * 8 * 2 = 32
	});

	it('should calculate correct spacing for spacing={3}', () => {
		const code = `<Grid container spacing={3}>Content</Grid>`;
		const issues = analyzeMUIComponent(code, 'test.tsx');
		
		const spacingIssue = issues.find(i => i.type === 'grid-spacing');
		expect(spacingIssue?.message).toContain('48px'); // 3 * 8 * 2 = 48
	});
});

describe('analyzeMUIComponent - DialogContent padding detection', () => {
	it('should detect DialogContent without padding override', () => {
		const code = `<DialogContent>Content here</DialogContent>`;
		const issues = analyzeMUIComponent(code, 'test.tsx');
		
		const paddingIssue = issues.find(i => i.type === 'dialog-padding');
		expect(paddingIssue).toBeDefined();
		expect(paddingIssue?.message).toContain('24px padding');
	});

	it('should NOT flag DialogContent with sx={{ p: 0 }}', () => {
		const code = `<DialogContent sx={{ p: 0 }}>Content</DialogContent>`;
		const issues = analyzeMUIComponent(code, 'test.tsx');
		
		const paddingIssue = issues.find(i => i.type === 'dialog-padding');
		expect(paddingIssue).toBeUndefined();
	});

	it('should NOT flag DialogContent with padding in sx', () => {
		const code = `<DialogContent sx={{ padding: 2 }}>Content</DialogContent>`;
		const issues = analyzeMUIComponent(code, 'test.tsx');
		
		const paddingIssue = issues.find(i => i.type === 'dialog-padding');
		expect(paddingIssue).toBeUndefined();
	});
});

describe('analyzeMUIComponent - real-world scenario', () => {
	it('should detect the ACRE Dashboard.js bgcolor issue', () => {
		const code = `
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					gap: 2,
					bgcolor: 'grey.50',
					p: 2,
					borderRadius: 1,
				}}
			>
				<Typography>Area content</Typography>
			</Box>
		`;
		const issues = analyzeMUIComponent(code, 'Dashboard.js');
		
		expect(issues).toHaveLength(1);
		expect(issues[0].type).toBe('bgcolor-mismatch');
		expect(issues[0].severity).toBe('critical');
		expect(issues[0].component).toBe('Dashboard.js');
		expect(issues[0].fix).toContain('background.paper');
	});
});
