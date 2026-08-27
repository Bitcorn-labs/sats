import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';
import App from '../App';

// There is no ic_env cookie under jsdom, so the anonymous vault reads bail out
// and the app renders its signed-out state -- which is the landing screen.
describe('App', () => {
  it('lands on the signed-out swap screen', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Wrap');
    expect(
      screen.getAllByText('Connect Internet Identity').length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText('PREVIEW ONLY — CONNECT TO WRAP OR UNWRAP')
    ).toBeInTheDocument();
  });

  it('shows the public vault strip before anyone connects', () => {
    render(<App />);

    expect(screen.getByText('CKBTC IN VAULT')).toBeInTheDocument();
    expect(screen.getByText('SATS SUPPLY')).toBeInTheDocument();
    expect(screen.getByText('HOLDERS')).toBeInTheDocument();
    expect(screen.getByText('1:100,000,000')).toBeInTheDocument();
  });

  it('quotes the default wrap amount live, without a session', () => {
    render(<App />);

    expect(screen.getByLabelText('Amount of ckBTC to wrap')).toHaveValue(
      '0.00100000'
    );
    expect(screen.getByText('100,000.00000000')).toBeInTheDocument();
    expect(screen.getByText('0.00100020 ckBTC')).toBeInTheDocument();
  });

  it('hides balances and the nav until a session exists', () => {
    render(<App />);

    expect(screen.getAllByText('Balance —').length).toBe(2);
    expect(
      screen.queryByRole('button', { name: 'Wallet' })
    ).not.toBeInTheDocument();
  });
});
