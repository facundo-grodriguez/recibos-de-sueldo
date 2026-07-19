import { createTheme } from '@mantine/core';

/**
 * Tema sobrio y funcional para el chrome de la app (distinto del PDF del
 * recibo, que es un documento legal con su propia identidad institucional).
 * Grises cálidos + un único acento, sin colores de "dashboard".
 */
export const theme = createTheme({
  primaryColor: 'slate',
  colors: {
    slate: [
      '#f4f3ee',
      '#e9e7de',
      '#dedcd0',
      '#c3c2b7',
      '#a8a69a',
      '#767568',
      '#52514e',
      '#3a3f36',
      '#2c3440',
      '#1c2128',
    ],
  },
  defaultRadius: 'sm',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
});
