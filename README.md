# Portal de Reportes

Aplicacion corporativa de reportes desplegable con Docker/Portainer.

## Arquitectura

- **Frontend:** React/Vite servido por Nginx.
- **Backend:** Node.js/Express.
- **Reportes:** PostgreSQL corporativo externo, usado exclusivamente en modo lectura.
- **Autenticacion:** SQLite local persistente dentro del volumen Docker `auth_data`.
- **Integracion externa:** SmartOLT.

PostgreSQL corporativo no recibe tablas, migraciones ni escrituras propias de esta aplicacion.

## Despliegue

El stack se define en `compose.yaml` y contiene solamente `frontend` y `backend`.
Las credenciales reales deben configurarse en Portainer y nunca subirse al repositorio.

Ver `PORTAINER_DEPLOY.md` para el procedimiento operativo.
