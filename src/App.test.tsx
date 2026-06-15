import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('AgendaOrg frontend', () => {
  it('renders login title', () => {
    render(<App />);
    expect(screen.getByText('AgendaOrg')).toBeInTheDocument();
  });
});
