import * as diff from 'diff';

export interface SemanticAnnotation {
  category: 'accessibility' | 'structure' | 'style' | 'content';
  message: string;
}

export interface SemanticDiffResult {
  added: number;
  removed: number;
  annotations: SemanticAnnotation[];
  rawDiff: diff.Change[];
}

export function generateSemanticDiff(before: string, after: string): SemanticDiffResult {
  const rawDiff = diff.diffLines(before, after);
  let added = 0, removed = 0;
  const annotations: SemanticAnnotation[] = [];

  rawDiff.forEach((change: diff.Change) => {
    if (change.added) {
      added += change.count || 0;
      // Accessibility heuristics
      if (/aria-|role=|alt=/.test(change.value)) {
        annotations.push({ category: 'accessibility', message: 'Accessibility attributes added' });
      }
      if (/button|nav|header|main|footer/.test(change.value)) {
        annotations.push({ category: 'structure', message: 'Landmark or interactive structure introduced' });
      }
      if (/color:|background:|font-size:/.test(change.value)) {
        annotations.push({ category: 'style', message: 'Visual style adjustments added' });
      }
    } else if (change.removed) {
      removed += change.count || 0;
      if (/aria-|role=|alt=/.test(change.value)) {
        annotations.push({ category: 'accessibility', message: 'Accessibility attributes removed' });
      }
    }
  });

  return { added, removed, annotations, rawDiff };
}
