# PetGo

App de paseo de mascotas para el Cercado de Cochabamba, Bolivia. Conecta dueños
que necesitan que paseen a su mascota con cuidadores cercanos.

**Todo el producto está en español boliviano.** Código, comentarios, nombres de
variables y textos de interfaz.

Proyecto de Grado · Ingeniería de Sistemas · UMSS.

---

## Estado

| Parte | Estado |
| --- | --- |
| Tema (`petgo-app/src/theme/`) | Completo — color, tipografía, espaciado, profundidad, movimiento. |
| Componentes (`petgo-app/src/components/`) | Completo — 21 componentes. |
| Pantallas | **Las 18, navegables.** |
| Capa de datos | Completa contra el adaptador mock. Un flag la apunta al backend real. |
| Ubicación, foto, fecha, tiempo real | Completos. |
| Backend (`petgo-backend/`) | Pendiente. |

La app **funciona hoy sin backend**: `src/api/mock/` implementa el mismo
contrato contra un almacén en memoria, con los datos del seed y las reglas de
estado completas. Cambiar `USAR_MOCK` en `petgo-app/src/api/config.ts` la
apunta al servidor real sin tocar ninguna pantalla.

---

## Cómo correrla

```bash
cd petgo-app && npm install && npx expo start
```

Escanea el QR con **Expo Go** desde tu teléfono. El Mac y el teléfono tienen
que estar en la misma red.

Otros comandos:

```bash
npm run typecheck   # tsc --noEmit
npm run pruebas     # reglas de estado, formateadores y geolocalización
```

### Cuentas del seed

Contraseña de todas: `petgo1234`. La pantalla de login las lista mientras
`USAR_MOCK` esté activo.

| Rol | Correo |
| --- | --- |
| Dueña | `camila.v@gmail.com` |
| Cuidador | `diego.r@gmail.com` |
| Cuidadora | `ana.p@gmail.com` |

La solicitud **#1042** queda en `proceso` con `awaitingConfirmation` activo: es
el caso que demuestra la regla de confirmación. Entra como Camila, abre
Notificaciones y pulsa "Confirmar".

---

## Reglas de negocio que no se negocian

Salen del cliente. Están implementadas en `petgo-app/src/api/estados.ts` y
cubiertas por `npm run pruebas`.

1. **Estados del servicio:** `publicada → aceptada → programada → proceso →
   finalizada`. `cancelada` es terminal y alcanzable desde cualquier punto.
2. **El cuidador avanza el estado hasta `proceso`.** Desde ahí marca el fin del
   paseo, lo que **no** finaliza el servicio: activa `awaitingConfirmation` y
   deja el estado en `proceso`.
3. **Sólo el dueño cierra el servicio** como `finalizada`, vía
   `POST /api/requests/:id/confirm`.
4. **Ambas partes pueden cancelar** en cualquier momento antes de un estado
   terminal.
5. Mientras `awaitingConfirmation` esté activo, el cuidador no puede avanzar más.

La bandera `awaitingConfirmation` existe precisamente para separar "el cuidador
terminó" de "el dueño cerró". Sin ella la regla 2 no se puede expresar.

Otras reglas:

- **Una solicitud puede llevar varias mascotas** (tabla puente `request_pets`).
  Los nombres se muestran unidos por " y ": "Rocco y Luna".
- **La conversación se ancla a la solicitud, no a un par de usuarios.** No hay
  tabla `conversations`: una conversación es una solicitud con cuidador asignado
  más sus mensajes.
- **El rol se elige en el registro** y determina toda la navegación posterior.
- **Sin sistema de calificaciones.** El cuidador sólo muestra su contador de
  paseos completados.
- **Sin pagos en la app.** `pagoBs` es sólo el monto ofrecido.

---

## Convenciones

### El backend devuelve las etiquetas ya formateadas

`"Bs 45"`, `"Hoy · 17:30"`, `"Rocco y Luna"`, `"a 600 m del punto de recogida"`.
**La app pinta, no formatea.** Si hace falta una etiqueta nueva, se añade al
serializador correspondiente en vez de construirla en el cliente.

Las fechas se calculan en zona horaria de Bolivia (`America/La_Paz`, UTC−4
fijo), no en la del servidor ni en la del teléfono. La única excepción es el
saludo ("Buenas tardes"), que depende del instante en que se pinta la pantalla
y no de ningún dato del servidor.

### Los chips de filtro viajan al backend

`"5 km"` → 5000 metros, `"Bs 40+"` → 40, `"Esta semana"` → rango de fechas. La
traducción no vive en la app.

### Ubicación y tiempo real

`useUbicacion()` pide el permiso y lee la posición; el permiso denegado es un
estado de primera clase con su propia pantalla y salida a los ajustes, porque el
lado cuidador entero depende de él.

En el adaptador mock, si la posición del dispositivo queda a más de 40 km del
Cercado se busca desde el centro del Cercado. Es un apoyo de demostración —
los datos del seed están clavados en Cochabamba y el emulador de Android arranca
en California. **El backend real no hace esto:** usa siempre la posición que le
manda el dispositivo.

`src/api/tiempoReal.ts` tiene dos transportes tras la misma interfaz: Socket.io
para producción y un emisor en memoria para el mock. El emisor local **no puede
simular dos dispositivos** — notifica sólo a la app que hizo la mutación. La
demostración de chat entre dos teléfonos necesita el backend levantado.

### PostGIS

- `ST_DWithin` sobre `geography` mide en **metros**, y es lo que usa el índice
  GiST. Poner `ST_Distance(...) < radio` en el `WHERE` degrada a escaneo
  secuencial.
- `ST_MakePoint` recibe **(longitud, latitud)**, en ese orden.
- Prisma no tiene tipo `geography`: las columnas `ubicacion` van como
  `Unsupported` y un trigger las mantiene sincronizadas desde `lat`/`lng`.
  Nunca se escribe `ubicacion` desde Prisma.

### Interfaz

- **Todos los colores salen de `src/theme/colors.ts`.** Nunca un hex suelto en
  un componente.
- **Todos los tamaños de texto salen de `src/theme/typography.ts`.** React
  Native no aplica `fontWeight` a una familia variable: cada peso es un archivo
  distinto y el peso viaja dentro de `fontFamily`.
- **Curvas y muelles salen de `src/theme/motion.ts`.**
- **Toda superficie pulsable usa `PressableScale`.**
- **Jerarquía de tarjetas:** `flat` / `raised` / `elevated`. Como mucho una
  `elevated` por pantalla.

---

## Stack

- **Móvil:** React Native · Expo SDK 57 · TypeScript · expo-router ·
  TanStack Query · Reanimated 4 · react-native-maps con tiles de CartoDB Positron.
- **Backend:** Node · Express · Prisma · Zod · Socket.io.
- **Base de datos:** PostgreSQL + PostGIS.

---

## Expo Go

El cliente fijó Expo Go, y eso condiciona qué módulos nativos se pueden usar.
Conviene verificar caso por caso antes de dar nada por perdido: la lista de lo
que trae Expo Go está en `expo/bundledNativeModules.json` del propio proyecto.

- **`react-native-keyboard-controller` sí está en Expo Go a partir del SDK 57.**
  El brief daba por hecho que no y que había que conformarse con
  `KeyboardAvoidingView`; era cierto en SDKs anteriores. El chat usa la
  librería de verdad, que sigue la posición real del teclado fotograma a
  fotograma en el hilo de UI.
- **Los tabs nativos son riesgosos** en Expo Go, y el diseño pide una barra muy
  específica con píldora de fondo. Va una barra propia.
- **react-native-maps en Android necesita una API key de Google** en `app.json`
  (`android.config.googleMaps.apiKey`), aunque los tiles vengan de CartoDB.
  Está vacía: hay que ponerla antes de compilar para Android.
- **Expo Go no es un entorno de rendimiento.** Cualquier juicio sobre si una
  animación se siente bien tiene que hacerse en una build de release, en el
  Android más lento que haya a mano.

---

## Decisiones abiertas

- **Fotos.** El selector de galería funciona y la foto elegida se ve, pero lo
  que se guarda es una ruta local del dispositivo (`file:///...`), no una URL
  pública: nadie más la ve. Falta decidir el almacenamiento (Cloudinary, S3,
  Supabase Storage) y el endpoint de subida. Cuando exista, `src/utiles/foto.ts`
  pasa a devolver la URL remota y el resto de la app no se entera. Los huecos
  sin foto muestran la inicial del sujeto sobre superficie tintada.
- **Transición `aceptada → programada`.** La dispara el cuidador a mano. Está
  sin decidir si debería ser automática al acercarse la fecha.
- **Pantallas sin diseñar** cuyos botones ya existen: recuperar contraseña,
  editar mascota, editar perfil, configuración, ayuda. Hoy lanzan un toast.
- **El cuidador no tiene pantalla** para ver los intereses que envió y siguen sin
  respuesta.
- **Chat con un interesado antes de aceptarlo.** El handoff pone un botón
  "Chatear" en la tarjeta de cuidador interesado, pero una conversación es una
  solicitud **con cuidador asignado**: antes de aceptar no hay hilo que abrir, y
  sin tabla `conversations` no hay dónde guardarlo. Por ahora ese botón abre
  WhatsApp y explica que el chat interno se abre al aceptar.
