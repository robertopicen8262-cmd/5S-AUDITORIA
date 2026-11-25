# Especificación de Seguridad Firestore — Sistema Inteligente de Auditoría 5S

## 1. Invariantes de Datos
1. **Autenticación verificada obligatoria**: Ninguna colección permite lectura o escritura anónima. Todo acceso exige `request.auth != null` y `request.auth.token.email_verified == true`.
2. **Integridad de propiedad (`ownerId`)**: Todo documento creado en `areas`, `stations`, `criteria`, `templates` y `audits` debe establecer `ownerId == request.auth.uid`, y `ownerId` es inmutable tras la creación.
3. **Aislamiento de PII (`users`)**: Los perfiles de usuario en `/users/{userId}` contienen correo electrónico (`email`) y sólo son legibles por el propietario (`request.auth.uid == userId`) o el administrador verificado. Ningún usuario puede auto-asignarse el rol `admin` en su perfil salvo el correo administrador inicializado.
4. **Integridad referencial de estaciones**: Toda estación en `/stations/{stationId}` debe referenciar un `areaId` existente en `/areas/{areaId}` cuyo propietario coincida o sea administrado por el usuario actual.
5. **Bloqueo de estado terminal en auditorías**: Las auditorías guardadas tienen `status == 'completed'` y no pueden ser alteradas por usuarios estándar después de su creación (sólo consulta y administración autorizada).
6. **Límites volumétricos y de tipo**: Todas las cadenas de texto, arreglos de secciones y firmas tienen límites estrictos de longitud (`size()`) y validación de tipo para prevenir agotamiento de recursos o campos ocultos.
7. **Sellos de tiempo del servidor**: `createdAt` y `updatedAt` se validan estrictamente con `request.time`.

## 2. "Dirty Dozen" — Payloads Maliciosos de Prueba
1. **Acceso anónimo a auditorías**: Lectura/escritura sin `request.auth`. Debe fallar con `PERMISSION_DENIED`.
2. **Correo no verificado**: Usuario autenticado con `email_verified: false` intentando crear un área o auditoría. Debe fallar con `PERMISSION_DENIED`.
3. **Suplantación de identidad (`ownerId` ajeno)**: Usuario A intenta crear un área o auditoría con `ownerId: "userB"`. Debe fallar con `PERMISSION_DENIED`.
4. **Auto-escalamiento de privilegios**: Usuario estándar intenta crear o actualizar `/users/{uid}` con `role: "admin"`. Debe fallar con `PERMISSION_DENIED`.
5. **Lectura cruzada de PII**: Usuario A intenta leer `/users/userB`. Debe fallar con `PERMISSION_DENIED`.
6. **Consulta `list` sin filtro de propietario**: Usuario A ejecuta `getDocs(collection(db, 'audits'))` sin `where('ownerId', '==', uid)`. Debe fallar con `PERMISSION_DENIED`.
7. **Campo fantasma (Shadow Field)**: Payload de creación en `areas` incluye campo no permitido `isApproved: true`. Debe fallar con `PERMISSION_DENIED`.
8. **Inyección de ID malicioso (Path Poisoning)**: Creación con ID `../admin/hack` o cadena > 128 caracteres. Debe fallar con `PERMISSION_DENIED`.
9. **Estación huérfana**: Creación de estación en `/stations/{id}` con `areaId: "inexistente"`. Debe fallar con `PERMISSION_DENIED`.
10. **Manipulación de marca de tiempo**: Creación de auditoría enviando un `createdAt` pasado o futuro distinto de `request.time`. Debe fallar con `PERMISSION_DENIED`.
11. **Mutación de auditoría completada**: Usuario intenta modificar `scorePercentage` o `classification` de una auditoría ya guardada (`status: 'completed'`). Debe fallar con `PERMISSION_DENIED`.
12. **Agotamiento de recursos (Payload gigante)**: Inserción de `generalObservations` con > 1,500 caracteres o arreglo `sections` con > 30 secciones. Debe fallar con `PERMISSION_DENIED`.
