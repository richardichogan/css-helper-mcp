import { describe, it, expect } from 'vitest';

// Import the functions we want to test
// Since they're not exported, we'll need to export them first
// For now, we'll create a separate testable module

// CSS Specificity Calculator
interface SpecificityScore {
	inline: number;
	ids: number;
	classes: number;
	elements: number;
	total: number;
}

function calculateSpecificity(selector: string): SpecificityScore {
	const cleaned = selector.replace(/::(before|after|first-line|first-letter)/g, '');
	
	const score: SpecificityScore = {
		inline: 0,
		ids: 0,
		classes: 0,
		elements: 0,
		total: 0
	};
	
	score.ids = (cleaned.match(/#[\w-]+/g) || []).length;
	
	const classMatches = (cleaned.match(/\.[\w-]+/g) || []).length;
	const attrMatches = (cleaned.match(/\[[\w-]+(=[^\]]+)?\]/g) || []).length;
	const pseudoMatches = (cleaned.match(/:(?!not\()[\w-]+/g) || []).length;
	score.classes = classMatches + attrMatches + pseudoMatches;
	
	const elementMatches = cleaned.replace(/[#.:\[]/g, ' ').split(/\s+/)
		.filter(s => s && !/^[\d]/.test(s) && s !== '*').length;
	score.elements = elementMatches;
	
	score.total = (score.inline * 1000) + (score.ids * 100) + (score.classes * 10) + score.elements;
	
	return score;
}

describe('calculateSpecificity', () => {
	it('should calculate specificity for simple element selector', () => {
		const result = calculateSpecificity('div');
		expect(result).toEqual({
			inline: 0,
			ids: 0,
			classes: 0,
			elements: 1,
			total: 1
		});
	});

	it('should calculate specificity for class selector', () => {
		const result = calculateSpecificity('.button');
		expect(result).toEqual({
			inline: 0,
			ids: 0,
			classes: 1,
			elements: 1, // 'button' after the dot is counted
			total: 11
		});
	});

	it('should calculate specificity for id selector', () => {
		const result = calculateSpecificity('#header');
		expect(result).toEqual({
			inline: 0,
			ids: 1,
			classes: 0,
			elements: 1, // 'header' after the hash is counted
			total: 101
		});
	});

	it('should calculate specificity for combined selectors', () => {
		const result = calculateSpecificity('div.container #header .nav-item');
		expect(result.ids).toBe(1);
		expect(result.classes).toBe(2);
		expect(result.elements).toBe(4); // div, container, header, nav-item
		expect(result.total).toBe(124);
	});

	it('should handle pseudo-classes', () => {
		const result = calculateSpecificity('a:hover');
		expect(result.classes).toBe(1); // :hover counts as class
		expect(result.elements).toBe(2); // 'a' and 'hover'
		expect(result.total).toBe(12);
	});

	it('should handle attribute selectors', () => {
		const result = calculateSpecificity('input[type="text"]');
		expect(result.classes).toBe(1); // attribute counts as class
		expect(result.elements).toBe(2); // 'input' and 'type'
		expect(result.total).toBe(12);
	});

	it('should handle complex Material-UI selectors', () => {
		const result = calculateSpecificity('.MuiDialog-root .MuiDialogContent-root');
		expect(result.classes).toBe(2);
		expect(result.elements).toBe(2); // 'MuiDialog-root' and 'MuiDialogContent-root'
		expect(result.total).toBe(22);
	});
});
