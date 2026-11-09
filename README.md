# DataCleaner

Aplicación web estática para importar, revisar, limpiar y exportar archivos CSV. **Todo se procesa en tu navegador; ningún archivo se envía a servicios externos.**

## Estado
El flujo principal está implementado: importar y previsualizar, revisar la tabla y el informe, limpiar y exportar. Incluye tabla paginada y ordenable, estadísticas de calidad, informe de importación y temas claro/oscuro.

Funciones disponibles: filtro por valores de una columna; detección de duplicados (resaltar, crear tabla, eliminar excedentes conservando primero o último, o elegir manualmente qué conservar en cada grupo); conservar columnas; pestañas de resultados; combinar varias bases; exportar CSV; deshacer eliminaciones, restaurar originales e historial.

El análisis de archivos de 5 MiB o más se ejecuta en el Web Worker de Papa Parse para evitar bloquear la interfaz durante el parseo. La normalización del conjunto y su almacenamiento siguen usando memoria del navegador.

Varias bases a la vez: cada CSV se carga como base independiente (con sus pestañas, historial y datos originales). "Combinar bases…" pregunta cuáles unir, muestra si los encabezados encajan y crea una base nueva apilando los registros (las que falten quedan vacías).

## Ejecutar
Los módulos ES requieren servidor (no funciona abriendo `index.html` con `file://`):
```
npm start        # o: python3 -m http.server 8080 --directory frontend
```
y abre http://localhost:8080. Pruebas (Node 20+): `npm test`.

## Autenticación con Supabase

El acceso usa Supabase Auth con correo y contraseña. No hay registro público: las cuentas deben ser creadas por el administrador en el panel de Supabase. En el panel de Supabase:

1. Crea un proyecto y habilita el proveedor **Email** en Authentication → Providers.
2. Copia la **Project URL** y la clave pública **publishable/anon**.
3. Pégalas en `frontend/js/auth/config.js`:

```js
export const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'tu-clave-publica';
```

No pongas la clave `service_role` en el navegador. La página usa `signInWithPassword` y sesiones persistentes de Supabase. Si no configuras `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`, la aplicación arranca en modo demo local para poder probarla sin credenciales.

## Estructura y responsabilidades
- `frontend/index.html` — punto de entrada de la aplicación.
- `frontend/js/app.js` — eventos y coordinación (importación, tema, render).
- `frontend/js/core/` — modelo, estado central y operaciones.
- `frontend/js/services/` — importación, exportación, filtros, duplicados y combinación.
- `frontend/js/ui/` — tabla, diálogos, pestañas, avisos y controles.
- `frontend/js/auth/` — integración de autenticación con Supabase.
- `frontend/css/` — estilos de layout, temas, tabla y componentes.
- `frontend/assets/` — iconos e imágenes de la interfaz.
- `frontend/lib/papaparse.min.js` — Papa Parse 5.4.1 local (sin CDN).
- `backend/` — reservado para una futura API; actualmente no hay servidor propio.
- `tests/` — pruebas automatizadas de los servicios y el estado.

La importación usa Papa Parse incluido localmente. Los servicios de filtros, duplicados, columnas y exportación están separados de la interfaz para facilitar sus pruebas y mantenimiento.

## Integridad de datos
No se usa conversión de tipos: `0012` sigue siendo `0012`. Ajustes inevitables, siempre informados: filas con menos celdas se completan con vacíos; encabezados vacíos o repetidos se renombran (`Columna N`, `nombre (2)`); las líneas totalmente vacías se omiten.

## Publicar
Sube la carpeta a GitHub y activa GitHub Pages sobre la rama principal.

## Limitaciones conocidas
Los archivos se mantienen completos en memoria y la normalización del resultado ocurre en el hilo principal; archivos de cientos de MB pueden exceder la memoria disponible aunque el parseo use un worker. El ordenamiento grande también ocurre en el hilo principal. Sin persistencia entre sesiones: al cerrar o recargar la página se pierde el trabajo.
