import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

describe('App (smoke)', () => {
  beforeEach(() => localStorage.clear());

  it('evaluates keyboard input with operator precedence', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard('2+3*4{Enter}');
    expect(screen.getByTestId('display-main')).toHaveTextContent('14');
  });

  it('evaluates button input and shows a friendly division-by-zero error', async () => {
    const user = userEvent.setup();
    render(<App />);
    const keypad = screen.getByRole('group', { name: 'Keypad' });
    await user.click(within(keypad).getByRole('button', { name: '8' }));
    await user.click(within(keypad).getByRole('button', { name: 'Divide' }));
    await user.click(within(keypad).getByRole('button', { name: '0' }));
    await user.click(within(keypad).getByRole('button', { name: 'Equals' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot divide by zero');
  });

  it('switches to the unit converter and converts as you type', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: /Units/ }));
    const input = screen.getByLabelText('From');
    await user.clear(input);
    await user.type(input, '10');
    expect(screen.getByLabelText('To')).toHaveTextContent('32.80839895');
  });

  it('shows the startup intro briefly, then removes it', () => {
    vi.useFakeTimers();
    render(<App />);
    expect(screen.getByTestId('splash')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.queryByTestId('splash')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('treats Enter as equals even after a key was clicked with the mouse', async () => {
    const user = userEvent.setup();
    render(<App />);
    const keypad = screen.getByRole('group', { name: 'Keypad' });
    await user.click(within(keypad).getByRole('button', { name: '7' }));
    await user.keyboard('*6{Enter}');
    expect(screen.getByTestId('display-main')).toHaveTextContent('42');
  });
});
