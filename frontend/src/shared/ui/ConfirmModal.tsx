import { Button, Group, Modal, Text } from '@mantine/core';
import type { ReactNode } from 'react';

interface ConfirmModalProps {
  opened: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  /** Color del botón de confirmación — 'red' para acciones destructivas (anular, dar de baja), el color por defecto para el resto. */
  confirmColor?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación genérica para acciones irreversibles o difíciles de deshacer (confirmar
 * importación, emitir recibos, reemitir, dar de baja un empleado). No usamos
 * `@mantine/modals` (no es una dependencia del proyecto todavía) — un `Modal` propio con
 * dos botones alcanza y evita agregar una librería nueva para esto.
 */
export function ConfirmModal({
  opened,
  title,
  message,
  confirmLabel = 'Confirmar',
  confirmColor,
  loading,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={title}
      centered
      closeOnEscape={!loading}
      closeOnClickOutside={!loading}
    >
      <Text size="sm" mb="lg">
        {message}
      </Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button color={confirmColor} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
}
