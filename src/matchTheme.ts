export type MatchPhase = 'prematch' | 'in-progress' | 'full-time';

export interface PhaseTokens {
  background: string;
  foreground: string;
  accent: string;
  emphasis: string;
  statusColor: string;
}

const PHASE_MAP: Record<MatchPhase, PhaseTokens> = {
  prematch: {
    background: 'var(--color-bg-prematch, #f5f8ff)',
    foreground: 'var(--color-fg, #1a1d21)',
    accent: 'var(--color-accent-prematch, #2d6cdf)',
    emphasis: 'var(--color-emphasis-prematch, #102a43)',
    statusColor: 'var(--color-status-prematch, #6c757d)'
  },
  'in-progress': {
    background: 'var(--color-bg-live, #081c32)',
    foreground: 'var(--color-fg-live, #ffffff)',
    accent: 'var(--color-accent-live, #ffba08)',
    emphasis: 'var(--color-emphasis-live, #ffd60a)',
    statusColor: 'var(--color-status-live, #20c997)'
  },
  'full-time': {
    background: 'var(--color-bg-final, #121212)',
    foreground: 'var(--color-fg-final, #f1f1f1)',
    accent: 'var(--color-accent-final, #6a4c93)',
    emphasis: 'var(--color-emphasis-final, #9d4edd)',
    statusColor: 'var(--color-status-final, #ff4d6d)'
  }
};

export function getPhaseTokens(phase: MatchPhase): PhaseTokens {
  return PHASE_MAP[phase];
}

export function generateCSSVariables(phase: MatchPhase): string {
  const t = getPhaseTokens(phase);
  return `:root {\n  --match-bg: ${t.background};\n  --match-fg: ${t.foreground};\n  --match-accent: ${t.accent};\n  --match-emphasis: ${t.emphasis};\n  --match-status: ${t.statusColor};\n}`;
}
