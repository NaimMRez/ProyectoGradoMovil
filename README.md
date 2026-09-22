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
| Backend (`petgo-backend/`) | Completo. Migrado y sembrado contra PostgreSQL 18 + PostGIS 3.6. |

La app **funciona hoy sin backend**: `src/api/mock/` implementa el mismo
contrato contra un almacén en memoria, con los datos del seed y las reglas de
estado completas. Cambiar `USAR_MOCK` en `petgo-app/src/api/config.ts` la
apunta al servidor real sin tocar ninguna pantalla.

---

## Estructura

```
proyectoGradoClaude/
├── petgo-app/       React Native · Expo SDK 57
├── petgo-backend/   Node · Express · Prisma · PostGIS · Socket.io
└── README.md
```

Son proyectos hermanos, no anidados. Lo único que los une es el contrato de la
API, que del lado de la app está aislado en `src/api/`.

---

## Cómo correr todo en local

Hay **dos modos**. El primero no necesita base de datos ni servidor.

### Modo A · Sólo la app (para ver y navegar las 18 pantallas)

```bash
cd petgo-app && npm install && npx expo start
```

Escanea el QR con **Expo Go**. Ya está: la app corre entera contra el
adaptador en memoria, con los datos del seed y las reglas de estado completas.
Es el modo por defecto (`USAR_MOCK = true`).

### Modo B · App + backend real

**1 · Postgres con PostGIS.** Sólo la primera vez:

```bash
brew install postgis
brew services start postgresql@18
createdb petgo_grado
```

**2 · El backend:**

```bash
cd petgo-backend
npm install
cp .env.example .env          # ajusta DATABASE_URL y genera un JWT_SECRET
npx prisma generate
npm run db:migrate            # extensión, tablas, triggers e índice GiST
npm run db:seed
npm run dev                   # http://localhost:4000
```

**3 · Apunta la app al backend.** Una sola línea en
`petgo-app/src/api/config.ts`:

```ts
export const USAR_MOCK = false;
```

No hace falta tocar la IP: `URL_BASE` la deduce del `hostUri` de Metro, que es
la misma a la que el teléfono acaba de conectarse para bajar el bundle.

**4 · La app**, en otra terminal:

```bash
cd petgo-app && npx expo start
```

### El Mac y el teléfono tienen que verse

Expo Go y el backend viajan por la red local, así que los dos dispositivos
tienen que estar en la **misma red** — típicamente el teléfono por wifi y el
Mac por wifi o por cable del mismo router.

Para comprobarlo, con el backend levantado:

```bash
curl http://$(ipconfig getifaddr en0 || ipconfig getifaddr en7):4000/health
```

Si eso responde `{"ok":true,...}`, el teléfono también llegará. Si no responde,
suele ser una de tres: el backend no está levantado, el Mac y el teléfono están
en redes distintas, o el firewall de macOS está bloqueando conexiones entrantes
(Ajustes → Red → Firewall).

### Detener todo

`Ctrl+C` en cada terminal. Y si quieres parar Postgres:

```bash
brew services stop postgresql@18
```

---

## Pruebas

```bash
cd petgo-app
npm run typecheck
npm run pruebas               # 20 · reglas de estado, formateadores, geolocalización

cd petgo-backend
npm run verificar             # typecheck + reglas + contrato
npm run pruebas               # 24 · las reglas del cliente, sin base de datos
npm run pruebas:contrato      # 23 · las rutas de la app existen en el servidor
npm run pruebas:humo          # 27 · contra la API levantada y sembrada
```

Las tres primeras del backend corren sin base de datos ni servidor.
`pruebas:humo` necesita las dos cosas: recorre el flujo entero por HTTP —
el cuidador rechazado con 409 mientras `awaitingConfirmation` está activo, el
dueño cerrando el servicio, la consulta geoespacial ordenada por distancia.

Otros comandos del backend:

```bash
npm run build && npm start    # compilado
npm run db:studio             # explorador de la base
npm run db:reset              # borra y vuelve a migrar desde cero
npm run db:seed               # vuelve a dejar la base en el estado de demo
```

---

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

La consulta de solicitudes cercanas está en
`petgo-backend/src/modules/requests/requests.repository.ts`, en SQL crudo.

- `ST_DWithin` sobre `geography` mide en **metros**, y es lo que puede usar el
  índice GiST. Poner `ST_Distance(...) < radio` en el `WHERE` da el mismo
  resultado y degrada a escaneo secuencial de la tabla entera.
- `ST_Distance` se calcula en el `SELECT`, no en el `WHERE`: así el filtro lo
  hace el índice y la distancia se calcula sólo para lo que sobrevivió.
- `ST_MakePoint` recibe **(longitud, latitud)**, en ese orden. Invertirlos no da
  error: coloca el punto en otro continente y la lista sale vacía.
- Prisma no tiene tipo `geography`: las columnas `ubicacion` van como
  `Unsupported` y un trigger las mantiene sincronizadas desde `lat`/`lng`.
  **Nunca se escribe `ubicacion` desde Prisma.**

Medido sobre 50.000 solicitudes sintéticas en esta misma base:

| Consulta | Plan | Tiempo |
| --- | --- | --- |
| `ST_DWithin(...)` | `Bitmap Index Scan on requests_ubicacion_gix` | 18,0 ms |
| `ST_Distance(...) < radio` | `Parallel Seq Scan on requests` | 29,4 ms |

Las dos devuelven lo mismo. La segunda no puede usar el índice, así que la
diferencia crece con la tabla: a 50.000 filas es un 60 % más lenta, y a un
millón deja de ser utilizable. Se reproduce con `EXPLAIN (ANALYZE)` dentro de
una transacción que se revierte.

### Dónde vive cada regla

`petgo-backend/src/domain/status.ts` es **la autoridad** sobre las transiciones
de estado. `petgo-app/src/api/estados.ts` es un espejo que sólo decide qué
botones se pintan. Si discrepan, manda el servidor, y el que está mal es el
cliente.

Las dos suites de pruebas cubren las mismas cinco reglas por separado, a
propósito.

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

- **Móvil:** React Native 0.86 · Expo SDK 57 · TypeScript · expo-router ·
  TanStack Query · Reanimated 4 · react-native-maps con tiles de CartoDB Positron.
- **Backend:** Node · Express · Prisma · Zod · Socket.io.
- **Base de datos:** PostgreSQL + PostGIS.

---

## Expo Go

El cliente fijó Expo Go, y eso decide dos cosas: **qué SDK puede usar el
proyecto** y qué módulos nativos están disponibles.

### El SDK lo fija Expo Go, no el proyecto

**El proyecto está en SDK 57 porque es el SDK que soporta el Expo Go publicado
en la App Store** (57.0.9, desde el 2 de septiembre de 2026). No es una elección
de comodidad: Expo Go admite un solo SDK a la vez, y un proyecto por delante
**o por detrás** de esa versión no abre en ningún iPhone, por nuevo que sea el
teléfono o el iOS. Este proyecto ya lo sufrió en los dos sentidos: nació en SDK
57, bajó a 54 en agosto porque la tienda tenía la 54.0.2, y volvió a 57 en
septiembre cuando la tienda actualizó. En iOS no se puede instalar un Expo Go
anterior; en Android sí, con el APK de expo.dev/go.

Antes de subir de SDK hay que comprobar qué hay publicado de verdad, y no
fiarse del `iosClientVersion` que devuelve la API de Expo — ése es su build
interno:

```bash
curl -s "https://itunes.apple.com/lookup?id=982107779" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s).results[0];console.log('Expo Go en la App Store:',r.version,'· iOS≥'+r.minimumOsVersion)})"
```

Con una *development build* (`npx expo run:ios`) el SDK viaja dentro del
binario y esta restricción desaparece. Pero eso sale de Expo Go, que es
justamente lo que el cliente no quiso.

### Módulos

Lo que trae Expo Go está en `expo/bundledNativeModules.json` del propio
proyecto. Conviene verificar caso por caso antes de dar nada por perdido:

- **`react-native-keyboard-controller` sí está en Expo Go desde el SDK 54 (y sigue en el 57).**
  El brief lo daba por perdido y aceptaba conformarse con el
  `KeyboardAvoidingView` de React Native. El chat usa el de la librería, que
  sigue la posición real del teclado fotograma a fotograma en el hilo de UI.
- **Los tabs nativos son riesgosos** en Expo Go, y el diseño pide una barra muy
  específica con píldora de fondo. Va una barra propia.
- **react-native-maps en Android necesita una API key de Google** en `app.json`
  (`android.config.googleMaps.apiKey`), aunque los tiles vengan de CartoDB.
  Está vacía: hay que ponerla antes de compilar para Android.
- **El config plugin de `@react-native-community/datetimepicker` está quitado**
  de `app.json`. En Expo Go los config plugins no se aplican, y ése arrastraba
  una dependencia que npm no resolvía. Hay que volver a añadirlo al pasar a una
  build nativa: sólo ajusta estilos de Android.
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
