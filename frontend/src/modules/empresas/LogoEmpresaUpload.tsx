import { useEffect, useState } from 'react';
import { Button, FileButton, Group, Image, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ApiError } from '../../shared/api/http';
import { useAuth } from '../../shared/auth/AuthContext';
import type { Empresa } from './api';
import { obtenerLogoEmpresaUrl } from './api';
import { useSubirLogoEmpresa } from './queries';

const FORMATOS_ACEPTADOS = 'image/png,image/jpeg,image/webp,image/svg+xml';

/** Logo de la empresa: se sube una vez (o se reemplaza) y de ahí en más aparece en todos los
 * recibos que se emitan, en el encabezado junto a la razón social. Vive acá (pantalla de
 * emisión) en vez de en la ficha de la empresa porque es el momento natural en que el contador
 * piensa "esto va a salir con mi nombre" — igual queda disponible para cualquier importación. */
export function LogoEmpresaUpload({ empresa }: { empresa: Empresa }) {
  const { token } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const subirLogo = useSubirLogoEmpresa();

  useEffect(() => {
    if (!empresa.tieneLogo || !token) {
      setPreviewUrl(null);
      return;
    }
    let cancelado = false;
    let urlObtenida: string | null = null;
    void obtenerLogoEmpresaUrl(token, empresa.id).then((url) => {
      if (cancelado) {
        URL.revokeObjectURL(url);
        return;
      }
      urlObtenida = url;
      setPreviewUrl(url);
    });
    return () => {
      cancelado = true;
      if (urlObtenida) URL.revokeObjectURL(urlObtenida);
    };
  }, [empresa.tieneLogo, empresa.id, token]);

  async function handleSubir(archivo: File | null): Promise<void> {
    if (!archivo) return;
    try {
      await subirLogo.mutateAsync({ empresaId: empresa.id, archivo });
      notifications.show({ message: 'Logo actualizado', color: 'green' });
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudo subir el logo',
        color: 'red',
      });
    }
  }

  return (
    <Group gap="sm" align="center">
      {previewUrl && <Image src={previewUrl} alt="Logo de la empresa" h={40} w="auto" fit="contain" />}
      <Stack gap={2}>
        <Text size="sm" fw={500}>
          Logo de la empresa
        </Text>
        <Text size="xs" c="dimmed">
          Aparece en el encabezado de todos los recibos que emitas de acá en más.
        </Text>
        <FileButton onChange={(archivo) => void handleSubir(archivo)} accept={FORMATOS_ACEPTADOS}>
          {(props) => (
            <Button {...props} size="xs" variant="light" loading={subirLogo.isPending} style={{ alignSelf: 'flex-start' }}>
              {empresa.tieneLogo ? 'Cambiar logo' : 'Subir logo'}
            </Button>
          )}
        </FileButton>
      </Stack>
    </Group>
  );
}
