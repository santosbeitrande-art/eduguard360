import { render, screen } from '@testing-library/react';
import Index from './Index';

describe('Index page', () => {
  it('renders main landing content', () => {
    render(<Index />);
    expect(screen.getByText(/Segurança escolar digital para pais/i)).toBeInTheDocument();
    expect(screen.getByText(/Recursos principais/i)).toBeInTheDocument();
    expect(screen.getByText(/Credenciais de Administrador/i)).toBeInTheDocument();
  });
});
