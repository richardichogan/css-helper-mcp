import { describe, it, expect } from 'vitest';

// Color Contrast Analyzer
function checkColorContrast(color1: string, color2: string): { issue: boolean; difference: number } {
	const luminanceMap: Record<string, number> = {
		'grey.50': 0.97,
		'grey.100': 0.93,
		'grey.200': 0.86,
		'grey.300': 0.74,
		'grey.900': 0.13,
		'white': 1.0,
		'black': 0.0,
		'background.paper': 0.12,
		'background.default': 0.08,
	};
	
	const lum1 = luminanceMap[color1] ?? 0.5;
	const lum2 = luminanceMap[color2] ?? 0.5;
	const diff = Math.abs(lum1 - lum2);
	
	return { issue: diff < 0.2, difference: diff };
}

describe('checkColorContrast', () => {
	it('should flag low contrast between grey.50 and white', () => {
		const result = checkColorContrast('grey.50', 'white');
		
		expect(result.issue).toBe(true); // difference < 0.2
		expect(result.difference).toBeLessThan(0.2);
	});

	it('should flag low contrast between grey.100 and white', () => {
		const result = checkColorContrast('grey.100', 'white');
		
		expect(result.issue).toBe(true);
		expect(result.difference).toBeLessThan(0.2);
	});

	it('should NOT flag good contrast between black and white', () => {
		const result = checkColorContrast('black', 'white');
		
		expect(result.issue).toBe(false); // difference = 1.0
		expect(result.difference).toBe(1.0);
	});

	it('should NOT flag good contrast between grey.900 and white', () => {
		const result = checkColorContrast('grey.900', 'white');
		
		expect(result.issue).toBe(false); // difference = 0.87
		expect(result.difference).toBeGreaterThan(0.8);
	});

	it('should flag low contrast between background.paper and background.default', () => {
		const result = checkColorContrast('background.paper', 'background.default');
		
		expect(result.issue).toBe(true); // 0.12 - 0.08 = 0.04
		expect(result.difference).toBeLessThan(0.2);
	});

	it('should return 0.5 for unknown colors', () => {
		const result = checkColorContrast('unknown-color', 'another-unknown');
		
		expect(result.difference).toBe(0);
		expect(result.issue).toBe(true);
	});

	it('should handle ACRE scenario: grey.50 in dark theme container', () => {
		// Scenario: grey.50 bgcolor in a dark theme (background.paper)
		const result = checkColorContrast('grey.50', 'background.paper');
		
		expect(result.issue).toBe(false); // Should have good contrast
		expect(result.difference).toBeGreaterThan(0.8); // 0.97 - 0.12 = 0.85
	});
});
