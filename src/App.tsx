import { Calculator } from './components/calculator/Calculator';
import { CurrencyConverter } from './components/converters/CurrencyConverter';
import { UnitConverter } from './components/converters/UnitConverter';
import logoUrl from './assets/logo-128.png';
import {
  CalculatorIcon,
  CurrencyIcon,
  DownloadIcon,
  FunctionIcon,
  MoonIcon,
  OfflineIcon,
  RulerIcon,
  SunIcon,
} from './components/icons/Icons';
import { ModeTabs, type TabDef } from './components/ModeTabs';
import { oneOf, usePersistentState } from './hooks/usePersistentState';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useOnline } from './hooks/useOnline';
import { useTheme } from './hooks/useTheme';

const MODES = ['standard', 'scientific', 'units', 'currency'] as const;
type Mode = (typeof MODES)[number];

const TABS: readonly TabDef<Mode>[] = [
  { id: 'standard', label: 'Standard', icon: CalculatorIcon },
  { id: 'scientific', label: 'Scientific', icon: FunctionIcon },
  { id: 'units', label: 'Units', icon: RulerIcon },
  { id: 'currency', label: 'Currency', icon: CurrencyIcon },
];

const TITLES: Record<Mode, string> = {
  standard: 'Standard calculator',
  scientific: 'Scientific calculator',
  units: 'Unit converter',
  currency: 'Currency converter',
};

export default function App() {
  const [mode, setMode] = usePersistentState<Mode>('shadowcalc:mode', 'standard', oneOf(MODES));
  const [theme, toggleTheme] = useTheme();
  const isCalculator = mode === 'standard' || mode === 'scientific';
  const online = useOnline();
  const install = useInstallPrompt();

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app__header">
        <div className="brand">
          <img className="brand__logo" src={logoUrl} alt="" width={40} height={40} />
          <span className="brand__name">ShadowCalc</span>
          <span className="brand__by">by AIShadow</span>
        </div>
        <div className="header-actions">
          {install && (
            <button type="button" className="button button--ghost install-button" onClick={() => void install()}>
              <DownloadIcon /> <span>Install app</span>
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {!online && (
        <div className="offline-banner" role="status">
          <OfflineIcon width={18} height={18} />
          <span>
            You’re offline. The calculator and unit converter work as normal; currency uses the last saved rates.
          </span>
        </div>
      )}

      <main id="main" className={`app__main ${isCalculator ? 'is-calculator' : ''}`}>
        <ModeTabs tabs={TABS} active={mode} onChange={setMode} />

        <section
          id={`panel-${mode}`}
          role="tabpanel"
          aria-labelledby={`tab-${mode}`}
          className="card"
          tabIndex={-1}
        >
          <h1 className="sr-only">{TITLES[mode]}</h1>
          {/* One Calculator instance for both modes keeps the expression when switching. */}
          {isCalculator && <Calculator scientific={mode === 'scientific'} />}
          {mode === 'units' && <UnitConverter />}
          {mode === 'currency' && <CurrencyConverter />}
        </section>
      </main>

      <footer className="app__footer">
        <p>
          © {new Date().getFullYear()} Hassan Malik · An AIShadow app ·{' '}
          <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">
            Rates by ExchangeRate-API
          </a>
        </p>
      </footer>
    </div>
  );
}
