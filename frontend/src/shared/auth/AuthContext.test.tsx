import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { emitUnauthorized } from '../api/session-events';
import { AuthProvider, useAuth } from './AuthContext';

function Consumidor() {
  const { estaAutenticado, email, iniciarSesion, cerrarSesion } = useAuth();
  return (
    <div>
      <span data-testid="estado">{estaAutenticado ? 'autenticado' : 'anonimo'}</span>
      <span data-testid="email">{email ?? ''}</span>
      <button onClick={() => iniciarSesion('token-123', 'juan@test.com')}>login</button>
      <button onClick={cerrarSesion}>logout</button>
    </div>
  );
}

describe('AuthProvider / useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('arranca sin sesión si no hay nada guardado', () => {
    render(
      <AuthProvider>
        <Consumidor />
      </AuthProvider>,
    );
    expect(screen.getByTestId('estado').textContent).toBe('anonimo');
  });

  it('iniciarSesion guarda en localStorage y actualiza el estado', () => {
    render(
      <AuthProvider>
        <Consumidor />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByText('login'));
    expect(screen.getByTestId('estado').textContent).toBe('autenticado');
    expect(screen.getByTestId('email').textContent).toBe('juan@test.com');
    expect(localStorage.getItem('recibos.sesion')).toContain('token-123');
  });

  it('cerrarSesion limpia el estado y localStorage', () => {
    render(
      <AuthProvider>
        <Consumidor />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByText('login'));
    fireEvent.click(screen.getByText('logout'));
    expect(screen.getByTestId('estado').textContent).toBe('anonimo');
    expect(localStorage.getItem('recibos.sesion')).toBeNull();
  });

  it('recupera la sesión persistida al montar de nuevo (sobrevive a un refresh)', () => {
    localStorage.setItem('recibos.sesion', JSON.stringify({ token: 't', email: 'ana@test.com' }));
    render(
      <AuthProvider>
        <Consumidor />
      </AuthProvider>,
    );
    expect(screen.getByTestId('estado').textContent).toBe('autenticado');
    expect(screen.getByTestId('email').textContent).toBe('ana@test.com');
  });

  it('se cierra sola ante un 401 emitido por el cliente HTTP', () => {
    render(
      <AuthProvider>
        <Consumidor />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByText('login'));
    expect(screen.getByTestId('estado').textContent).toBe('autenticado');

    act(() => {
      emitUnauthorized();
    });

    expect(screen.getByTestId('estado').textContent).toBe('anonimo');
  });
});
