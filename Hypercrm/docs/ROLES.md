# Sistema de Roles - HyperISP

El sistema cuenta con un modelo híbrido de permisos basado en **Roles Específicos** y **Perfiles Maestros**.

## Perfiles Maestros (Bypass)
Estos perfiles tienen acceso global o extendido sin necesidad de validar IDs de roles específicos.

1. **Administrador (`es_admin: true`)**
   - Acceso total e irrestricto a todo el sistema.
   - Si `es_admin` es `true`, el método `hasRole()` siempre devolverá `true`.

2. **Perfil Técnico (`tecnico: true`)**
   - Perfil especial para operarios de campo y soporte.
   - Se utiliza para otorgar acceso general a módulos de infraestructura y técnica sin requerir asignación de roles individuales. (En desarrollo/implementación futura según requerimientos).

## Roles Específicos (IDs)
Se requiere el ID exacto del rol asignado en la base de datos.
- **Rol 1**: Administrativo
- **Rol 2**: Cajero
- **Rol 3**: Supervisor Técnico (Requerido para pantallas como *Gestión de Hardware*).
- **Rol 4**: AVL (Requerido para control de flota móvil).

---
*Nota: La validación se realiza en el frontend consumiendo el EJB a través del AuthContext.*
