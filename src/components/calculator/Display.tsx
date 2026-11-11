import { useEffect, useRef } from 'react';
import { groupDigits } from '../../core/expression';
import { expressionText, type CalcState } from '../../core/calculator/inputModel';
import { AlertIcon } from '../icons/Icons';

interface DisplayProps {
  state: CalcState;
  preview: string | null;
  angleLabel?: string;
}

const sizeClass = (text: string) =>
  text.length > 22 ? 'is-xs' : text.length > 16 ? 'is-sm' : text.length > 11 ? 'is-md' : '';

export function Display({ state, preview, angleLabel }: DisplayProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const expression = expressionText(state.tokens);

  const main = state.evaluated && state.lastResult ? groupDigits(state.lastResult) : expression || '0';
  const secondary = state.evaluated
    ? `${state.lastExpression ?? ''} =`
    : preview !== null
      ? `= ${groupDigits(preview)}`
      : ' ';

  // Keep the end of long expressions in view.
  useEffect(() => {
    const el = mainRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [main]);

  return (
    <section className="display" aria-label="Calculator display">
      <div className="display__meta">
        {angleLabel && <span className="display__badge">{angleLabel}</span>}
        <span className="display__secondary">{secondary}</span>
      </div>
      <div
        ref={mainRef}
        className={`display__main ${sizeClass(main)} ${state.evaluated ? 'is-result' : ''}`}
        data-testid="display-main"
      >
        {main}
      </div>
      {/* Announce results to screen readers without reading every keypress. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {state.evaluated && state.lastResult ? `Result ${state.lastResult}` : ''}
      </p>
      <p className={`display__error ${state.error ? 'is-visible' : ''}`} role="alert">
        {state.error && (
          <>
            <AlertIcon width={16} height={16} /> {state.error}
          </>
        )}
      </p>
    </section>
  );
}
