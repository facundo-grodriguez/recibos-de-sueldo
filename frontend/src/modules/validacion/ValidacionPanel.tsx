import { Alert, Badge, Stack, Table, Text, Title } from '@mantine/core';
import { formatearMoneda } from '../../shared/format/formatearMoneda';
import type { ResultadoValidacionImportacion } from './api';

interface ValidacionPanelProps {
  validacion: ResultadoValidacionImportacion;
}

export function ValidacionPanel({ validacion }: ValidacionPanelProps) {
  return (
    <Stack gap="sm">
      <Title order={4}>Validación</Title>
      {validacion.erroresGlobales.map((error) => (
        <Alert key={error} color="red">
          {error}
        </Alert>
      ))}
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Apellido y nombre</Table.Th>
            <Table.Th>CUIL</Table.Th>
            <Table.Th>Neto</Table.Th>
            <Table.Th>Costo laboral</Table.Th>
            <Table.Th>Estado</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {validacion.empleados.map((empleado) => (
            <Table.Tr key={empleado.cuil}>
              <Table.Td>
                {empleado.apellido}, {empleado.nombre}
              </Table.Td>
              <Table.Td>{empleado.cuil}</Table.Td>
              <Table.Td>{formatearMoneda(empleado.totales.neto)}</Table.Td>
              <Table.Td>{formatearMoneda(empleado.totales.costoLaboralTotal)}</Table.Td>
              <Table.Td>
                <Stack gap={2}>
                  <Badge color={empleado.errores.length > 0 ? 'red' : 'green'}>
                    {empleado.errores.length > 0 ? 'Con error' : 'OK'}
                  </Badge>
                  {empleado.errores.map((error) => (
                    <Text key={error} size="xs" c="red">
                      {error}
                    </Text>
                  ))}
                  {empleado.advertencias.map((advertencia) => (
                    <Text key={advertencia} size="xs" c="orange">
                      {advertencia}
                    </Text>
                  ))}
                </Stack>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
