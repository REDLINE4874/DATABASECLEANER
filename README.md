# DataCleaner

Aplicación web estática para importar archivos CSV, revisarlos en una tabla tipo gestor SQL y (en próximas fases) depurarlos y exportarlos. **Todo se procesa en tu navegador; ningún archivo se envía a servicios externos.**

## Estado: Fases 1 y 2
Incluye: importación con vista previa (delimitador, codificación, encabezados), tabla con paginación, ordenamiento y encabezados fijos, estadísticas básicas, informe de importación y tema claro/oscuro.
Funciones: importación con vista previa, tabla paginada y ordenable, estadísticas, filtro por valores de una columna, duplicados (resaltar, tabla de duplicados, eliminar excedentes conservando primero o último), conservar columnas (las no marcadas se eliminan), pestañas de resultados, exportación CSV, deshacer, restaurar originales e historial.
Varias bases a la vez: cada CSV se carga como base independiente (con sus pestañas, historial y datos originales). "Combinar bases…" pregunta cuáles unir, muestra si los encabezados encajan y crea una base nueva apilando los registros (las que falten quedan vacías).
Pendiente: elegir manualmente el registro a conservar, Web Worker para archivos muy grandes.

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

No pongas la clave `service_role` en el navegador. La página usa `signInWithPassword` y sesiones persistentes de Supabase.

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

Se omitieron a propósito `tabManager`, `workers`, y los servicios de filtros, duplicados, columnas y exportación hasta que su fase los necesite.

## Integridad de datos
No se usa conversión de tipos: `0012` sigue siendo `0012`. Ajustes inevitables, siempre informados: filas con menos celdas se completan con vacíos; encabezados vacíos o repetidos se renombran (`Columna N`, `nombre (2)`); las líneas totalmente vacías se omiten.

## Publicar
Sube la carpeta a GitHub y activa GitHub Pages sobre la rama principal.

## Limitaciones conocidas
Archivos muy grandes (>100 000 filas o cientos de MB) se leen completos en memoria. El ordenamiento de ~100 000 filas ocurre en el hilo principal. Sin persistencia entre sesiones.
