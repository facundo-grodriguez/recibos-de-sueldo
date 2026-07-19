/**
 * Copia embebida del contenido vigente de docs/legal/ (fuera de app/, según
 * convención del repo) al momento de construir esta pantalla. Son borradores
 * sin validez legal (ver ADR-045) — actualizar a mano si el borrador cambia.
 */

export interface SeccionLegal {
  titulo: string;
  cuerpo: string;
}

export const TERMINOS_Y_CONDICIONES: SeccionLegal[] = [
  {
    titulo: '1. Objeto',
    cuerpo:
      'Estos Términos regulan el uso de la plataforma ("el Servicio"), que convierte datos de liquidación de sueldos ya procesados por el Cliente en recibos de sueldo conformes a la normativa vigente, y los conserva con historial, versionado e integridad verificable.',
  },
  {
    titulo: '2. Rol del Servicio: repositorio técnico, no archivo legal oficial',
    cuerpo:
      'El Servicio actúa como repositorio técnico de los recibos que genera: conserva versiones, historial y trazabilidad, y garantiza la integridad de cada documento mediante una huella digital (hash) verificable. El Servicio no es el archivo legal oficial del Cliente ni sustituye ninguna obligación de conservación documental que la legislación laboral, previsional o impositiva le imponga como empleador.',
  },
  {
    titulo: '3. Responsabilidades del Cliente',
    cuerpo:
      'La exactitud de los datos de liquidación cargados (montos, conceptos, clasificación normativa, datos de pago); la exactitud de la relación laboral y de la liquidación en sí; conservar su propia copia de los documentos según sus obligaciones legales; y el uso correcto de anulación y reemisión — el Servicio deja registro de ambos eventos, pero no valida la razonabilidad de la corrección.',
  },
  {
    titulo: '4. Responsabilidades del Servicio',
    cuerpo:
      'Generar el recibo con el formato exigido por la normativa vigente; mantener la integridad de cada recibo (documento inmutable + hash); conservar el historial completo de emisiones, anulaciones y reemisiones con trazabilidad de quién y cuándo; aplicar medidas de seguridad razonables; y notificar incidentes de seguridad relevantes.',
  },
  {
    titulo: '5. Integridad y disponibilidad',
    cuerpo:
      'Cada recibo emitido incluye un hash SHA-256 que permite verificar que no fue alterado desde su emisión. El Servicio realiza sus mejores esfuerzos para mantener la disponibilidad, sin garantizar un SLA específico en esta etapa del producto.',
  },
  {
    titulo: '6. Limitación de responsabilidad',
    cuerpo:
      'El Servicio no asume responsabilidad por errores originados en los datos provistos por el Cliente, ni por el uso que el Cliente haga de los recibos generados, ni por incumplimientos del Cliente a sus propias obligaciones documentales, laborales, previsionales o impositivas.',
  },
  {
    titulo: '7. Vigencia y modificaciones',
    cuerpo:
      'Estos Términos rigen desde la aceptación explícita del Cliente al registrarse. El Servicio puede modificarlos, notificando al Cliente con antelación razonable.',
  },
];

export const ACUERDO_TRATAMIENTO_DATOS: SeccionLegal[] = [
  {
    titulo: '1. Partes y roles',
    cuerpo:
      'El Cliente (empleador o estudio contable) es el Responsable del tratamiento de los datos personales de sus empleados. El Servicio actúa como Encargado del tratamiento: procesa y almacena esos datos exclusivamente para prestar el Servicio, siguiendo las instrucciones del Cliente.',
  },
  {
    titulo: '2. Objeto y alcance del tratamiento',
    cuerpo:
      'Generar recibos de sueldo conformes a la normativa vigente, validarlos, emitirlos y conservarlos con historial, versionado e integridad verificable, mientras dure la relación contractual con el Cliente.',
  },
  {
    titulo: '3. Categorías de datos e interesados',
    cuerpo:
      'Interesados: empleados del Cliente. Datos tratados: nombre, apellido, CUIL, categoría laboral, fecha de ingreso, conceptos de liquidación y montos asociados. No se procesan categorías especiales de datos más allá de lo estrictamente necesario para el recibo.',
  },
  {
    titulo: '4. Obligaciones del Encargado (el Servicio)',
    cuerpo:
      'Tratar los datos únicamente para los fines descriptos, según las instrucciones del Cliente; no cederlos a terceros salvo obligación legal o autorización expresa; aplicar medidas de seguridad razonables (aislamiento multi-tenant, auditoría transversal, hash de integridad); y garantizar la confidencialidad del personal con acceso.',
  },
  {
    titulo: '5. Seguridad',
    cuerpo:
      'Medidas ya implementadas: autenticación de usuarios, aislamiento de datos por empresa, registro de auditoría de operaciones sensibles, hash de integridad por documento.',
  },
  {
    titulo: '6. Derechos de los interesados',
    cuerpo:
      'Las solicitudes de acceso, rectificación, actualización o supresión de datos por parte de un empleado deben canalizarse a través del Cliente, quien es el punto de contacto ante el interesado.',
  },
  {
    titulo: '7. Devolución o eliminación de datos al finalizar la relación',
    cuerpo:
      'Al finalizar la relación contractual, el Servicio pondrá a disposición del Cliente sus datos para su descarga, y los eliminará de sus sistemas según el plazo y modalidad que se acuerde.',
  },
];
