import { useRef, type ComponentType, type KeyboardEvent, type SVGProps } from 'react';

export interface TabDef<T extends string> {
  id: T;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

interface ModeTabsProps<T extends string> {
  tabs: readonly TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
}

/** WAI-ARIA tabs pattern with roving focus (←/→/Home/End). */
export function ModeTabs<T extends string>({ tabs, active, onChange }: ModeTabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.id === active);
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    const tab = tabs[next];
    if (tab) {
      onChange(tab.id);
      refs.current[next]?.focus();
    }
  };

  return (
    <div className="tabs" role="tablist" aria-label="Calculator mode" onKeyDown={onKeyDown}>
      {tabs.map(({ id, label, icon: Icon }, i) => {
        const selected = id === active;
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`tab-${id}`}
            role="tab"
            type="button"
            className="tabs__tab"
            aria-selected={selected}
            aria-controls={`panel-${id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
