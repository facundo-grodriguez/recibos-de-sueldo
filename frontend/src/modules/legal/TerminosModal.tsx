import { Alert, Divider, Modal, ScrollArea, Stack, Text, Title } from '@mantine/core';
import { ACUERDO_TRATAMIENTO_DATOS, TERMINOS_Y_CONDICIONES, type SeccionLegal } from './contenidoLegal';

interface TerminosModalProps {
  opened: boolean;
  onClose: () => void;
}

function Secciones({ secciones }: { secciones: SeccionLegal[] }) {
  return (
    <Stack gap="sm">
      {secciones.map((seccion) => (
        <Stack key={seccion.titulo} gap={4}>
          <Text fw={600} size="sm">
            {seccion.titulo}
          </Text>
          <Text size="sm" c="dimmed">
            {seccion.cuerpo}
          </Text>
        </Stack>
      ))}
    </Stack>
  );
}

export function TerminosModal({ opened, onClose }: TerminosModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Términos y Condiciones — Acuerdo de Tratamiento de Datos" size="lg">
      <ScrollArea.Autosize mah={480}>
        <Stack gap="md">
          <Alert color="yellow" title="Borrador sin validez legal">
            Este texto es un punto de partida sin revisión legal profesional todavía — no debe usarse con clientes
            reales sin que un abogado matriculado lo revise y apruebe.
          </Alert>
          <Title order={4}>Términos y Condiciones de Uso</Title>
          <Secciones secciones={TERMINOS_Y_CONDICIONES} />
          <Divider label="Acuerdo de Tratamiento de Datos (DPA)" labelPosition="center" />
          <Secciones secciones={ACUERDO_TRATAMIENTO_DATOS} />
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
}
