import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DemoForm } from './DemoForm';

// Mock the ApiService
const mockSubmitDemoRequest = vi.fn();
vi.mock('@/services/api', () => ({
  ApiService: {
    submitDemoRequest: mockSubmitDemoRequest,
  },
}));

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: mockToast,
}));

describe('DemoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<DemoForm />);

    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nome da escola/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/seu papel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /solicitar demonstração/i })).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    render(<DemoForm />);

    const submitButton = screen.getByRole('button', { name: /solicitar demonstração/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nome deve ter pelo menos 2 caracteres/i)).toBeInTheDocument();
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
      expect(screen.getByText(/nome da escola deve ter pelo menos 2 caracteres/i)).toBeInTheDocument();
      expect(screen.getByText(/selecione um papel/i)).toBeInTheDocument();
    });
  });

  it('submits form successfully', async () => {
    mockSubmitDemoRequest.mockResolvedValue({ data: { id: '1' } });

    render(<DemoForm />);

    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'João Silva' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'joao@email.com' },
    });
    fireEvent.change(screen.getByLabelText(/nome da escola/i), {
      target: { value: 'Escola Central' },
    });

    // Select role
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    fireEvent.click(screen.getByText('Diretor'));

    fireEvent.change(screen.getByLabelText(/mensagem/i), {
      target: { value: 'Mensagem de teste' },
    });

    const submitButton = screen.getByRole('button', { name: /solicitar demonstração/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitDemoRequest).toHaveBeenCalledWith({
        name: 'João Silva',
        email: 'joao@email.com',
        school: 'Escola Central',
        role: 'director',
        message: 'Mensagem de teste',
      });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Pedido de demonstração enviado!',
        description: 'Entraremos em contato em breve.',
      });
    });
  });

  it('handles submission error', async () => {
    mockSubmitDemoRequest.mockResolvedValue({ error: 'Network error' });

    render(<DemoForm />);

    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'João Silva' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'joao@email.com' },
    });
    fireEvent.change(screen.getByLabelText(/nome da escola/i), {
      target: { value: 'Escola Central' },
    });

    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    fireEvent.click(screen.getByText('Diretor'));

    const submitButton = screen.getByRole('button', { name: /solicitar demonstração/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erro ao enviar pedido',
        description: 'Network error',
        variant: 'destructive',
      });
    });
  });

  it('calls onSuccess callback on successful submission', async () => {
    mockSubmitDemoRequest.mockResolvedValue({ data: { id: '1' } });
    const mockOnSuccess = vi.fn();

    render(<DemoForm onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'João Silva' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'joao@email.com' },
    });
    fireEvent.change(screen.getByLabelText(/nome da escola/i), {
      target: { value: 'Escola Central' },
    });

    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    fireEvent.click(screen.getByText('Diretor'));

    const submitButton = screen.getByRole('button', { name: /solicitar demonstração/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});</content>
<parameter name="filePath">c:\Users\AEAO\Desktop\Santos\website-guide eduguard360\src\components\DemoForm.test.tsx