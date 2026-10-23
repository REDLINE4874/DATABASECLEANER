# Backend

Actualmente DataCleaner no tiene un backend propio. La aplicación procesa los CSV en el navegador y usa Supabase Auth directamente desde el frontend.

Esta carpeta queda preparada para futuras funcionalidades de servidor, por ejemplo:

- API para persistencia o procesamiento de archivos grandes.
- Validación y autorización del lado del servidor.
- Variables y configuración de despliegue del backend.

No se deben colocar aquí claves privadas de Supabase mientras no exista una API backend que las consuma.
