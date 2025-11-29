import { promises as fs } from 'fs';
import { glob } from 'glob';
import * as path from 'path';

export interface StyleIssue {
  file: string;
  line: number;
  rule: string;
  severity: 'error' | 'warning';
  detail: string;
}

export interface StyleAuditResult {
  issues: StyleIssue[];
  summary: {
    buttons: number;
    spacing: number;
    colors: number;
    typography: number;
  };
}

export async function runStyleAudit(limitFiles = 120, workspacePath?: string): Promise<StyleAuditResult> {
  const issues: StyleIssue[] = [];
  const summary = { buttons: 0, spacing: 0, colors: 0, typography: 0 };

  // Find component files
  const componentFiles = await glob('**/*.{tsx,jsx,css,scss}', {
    cwd: workspacePath || process.cwd(),
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
  });

  const filesToCheck = componentFiles.slice(0, limitFiles);

  for (const file of filesToCheck) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const rel = path.relative(workspacePath || process.cwd(), file);
      const lines = content.split('\n');

      lines.forEach((line, i) => {
        // Check button variants
        if (/<[Bb]utton[^>]*variant=['"]/.test(line)) {
          const variantMatch = line.match(/variant=['"]([^'"]+)/);
          if (variantMatch && !['contained', 'outlined', 'text'].includes(variantMatch[1])) {
            issues.push({
              file: rel,
              line: i + 1,
              rule: 'button-variant',
              severity: 'warning',
              detail: `Non-standard button variant: ${variantMatch[1]}`
            });
            summary.buttons++;
          }
        }

        // Check spacing (not 4px multiples)
        const spacingMatch = line.match(/(?:padding|margin|gap|spacing):\s*['"]?(\d+)px/);
        if (spacingMatch) {
          const val = parseInt(spacingMatch[1]);
          if (val % 4 !== 0) {
            issues.push({
              file: rel,
              line: i + 1,
              rule: 'spacing-scale',
              severity: 'warning',
              detail: `Spacing ${val}px is not a multiple of 4px`
            });
            summary.spacing++;
          }
        }

        // Check raw colors
        if (/#[0-9a-fA-F]{3,6}/.test(line) && !line.includes('theme.palette')) {
          issues.push({
            file: rel,
            line: i + 1,
            rule: 'raw-color',
            severity: 'warning',
            detail: 'Using raw color instead of theme token'
          });
          summary.colors++;
        }

        // Check typography
        if (/fontSize:\s*['"]?\d+px/.test(line) && !line.includes('theme.typography')) {
          issues.push({
            file: rel,
            line: i + 1,
            rule: 'typography-scale',
            severity: 'warning',
            detail: 'Using raw font size instead of typography scale'
          });
          summary.typography++;
        }
      });
    } catch (error) {
      // Skip files that can't be read
    }
  }

  return { issues, summary };
}
