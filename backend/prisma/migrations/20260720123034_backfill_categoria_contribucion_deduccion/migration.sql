-- ADR-069: categoriaContribucion pasa a ser obligatoria también para
-- tipo = 'deduccion' (antes era opcional). Esto es solo compatibilidad hacia
-- atrás para datos ya cargados antes de la regla: cualquier deducción sin
-- categoría se migra a 'otros' (la categoría residual real), para que quede
-- consistente con la nueva regla de dominio. A partir de esta migración, toda
-- deducción nueva se clasifica siempre a través de ClasificacionConcepto.create,
-- que ya exige una categoría — este UPDATE no se repite nunca a mano.

UPDATE importacion_filas
SET categoria_contribucion = 'otros'
WHERE tipo = 'deduccion' AND categoria_contribucion IS NULL;

UPDATE perfil_mapeo_conceptos
SET categoria_contribucion = 'otros'
WHERE tipo = 'deduccion' AND categoria_contribucion IS NULL;
