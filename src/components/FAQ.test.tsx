import { render, screen } from '@testing-library/react';
import FAQ from './FAQ';

describe('FAQ', () => {
  it('renders FAQ section with search box and questions', () => {
    render(<FAQ />);
    expect(screen.getByText(/Frequently Asked Questions|Perguntas Frequentes/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search questions|Buscar perguntas/i)).toBeInTheDocument();
  });
});
