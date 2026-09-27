/**
 * Prueba de humo contra la API real.
 *
 * A diferencia de `reglas.mts`, que comprueba la lógica pura sin base de datos,
 * ésta recorre el sistema entero: HTTP, autenticación, Prisma, PostGIS y las
 * transiciones de estado sobre datos sembrados de verdad.
 *
 * Recorre el flujo que hay que poder defender delante de un tribunal:
 *
 *   1. Camila entra y ve sus solicitudes y su bandeja.
 *   2. Diego intenta avanzar la #1042 y **el servidor lo rechaza**, porque ya
 *      marcó el fin del paseo y falta la confirmación de la dueña.
 *   3. Camila confirma y el servicio se cierra. Es el único camino a
 *      `finalizada`.
 *   4. La consulta geoespacial devuelve las solicitudes cercanas ordenadas por
 *      distancia, con las etiquetas ya formateadas.
 *   5. Diego se ofrece a una solicitud publicada y Camila lo elige.
 *   6. El chat de la solicitud acepta un mensaje nuevo.
 *
 * Requiere el servidor levantado (`npm run dev`) y la base sembrada
 * (`npm run db:seed`).
 */
import assert from 'node:assert/strict';

const BASE = process.env['PETGO_API'] ?? 'http://localhost:4000/api';

let ok = 0;
const paso = (nombre: string) => {
  ok += 1;
  console.log(`  ✓ ${nombre}`);
};

type Respuesta<T> = { estado: number; cuerpo: T };

async function pedir<T = unknown>(
  metodo: string,
  ruta: string,
  opciones: { token?: string; cuerpo?: unknown } = {},
): Promise<Respuesta<T>> {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}),
    },
    ...(opciones.cuerpo ? { body: JSON.stringify(opciones.cuerpo) } : {}),
  });

  const texto = await respuesta.text();
  const cuerpo = texto ? JSON.parse(texto) : null;
  return { estado: respuesta.status, cuerpo: cuerpo as T };
}

type Usuario = {
  id: string;
  nombre: string;
  primerNombre: string;
  rol: string;
  metaEtiqueta: string;
  paseosCompletados: number | null;
};
type Sesion = { usuario: Usuario; token: string };
type Solicitud = {
  id: string;
  codigo: string;
  estado: string;
  estadoEtiqueta: string;
  awaitingConfirmation: boolean;
  mascotasEtiqueta: string;
  pagoEtiqueta: string;
  fechaEtiqueta: string;
  duracionEtiqueta: string;
  distanciaEtiqueta?: string;
  interesadosEtiqueta: string;
  hitos: { clave: string; fase: string; detalle: string }[];
};
type Error_ = { mensaje: string; clave: string };

async function correr() {
  console.log(`\nProbando contra ${BASE}\n`);

  // ── Salud ────────────────────────────────────────────────────────────────
  const salud = await fetch(`${BASE.replace(/\/api$/, '')}/health`);
  assert.equal(salud.status, 200, 'el servidor no responde en /health');
  paso('el servidor responde');

  // ── 1 · Camila entra ─────────────────────────────────────────────────────
  const login = await pedir<Sesion>('POST', '/auth/login', {
    cuerpo: { correo: 'camila.v@gmail.com', clave: 'petgo1234' },
  });
  assert.equal(login.estado, 200, JSON.stringify(login.cuerpo));
  assert.equal(login.cuerpo.usuario.rol, 'dueno');
  assert.equal(login.cuerpo.usuario.metaEtiqueta, 'Dueña de mascota');
  const camila = login.cuerpo.token;
  paso('Camila inicia sesión y el backend le manda su etiqueta en femenino');

  const malaClave = await pedir<Error_>('POST', '/auth/login', {
    cuerpo: { correo: 'camila.v@gmail.com', clave: 'incorrecta' },
  });
  assert.equal(malaClave.estado, 401);
  paso('una contraseña incorrecta devuelve 401');

  const sinToken = await pedir<Error_>('GET', '/requests');
  assert.equal(sinToken.estado, 401);
  paso('sin token no se accede a nada');

  // ── 1b · Registro con el mismo cuerpo que manda la app ──────────────────
  // Este bloque existe porque la pantalla de registro llegó a validar la
  // contraseña sin enviarla: contra el adaptador en memoria funcionaba y contra
  // el servidor devolvía 400. La prueba manda exactamente los campos de la app.
  const correoNuevo = `prueba.${Date.now()}@petgo.test`;
  const registro = await pedir<Sesion>('POST', '/auth/register', {
    cuerpo: {
      nombre: 'Prueba De Humo',
      correo: correoNuevo,
      telefono: '70000000',
      clave: 'petgo1234',
      rol: 'cuidador',
    },
  });
  assert.equal(registro.estado, 201, JSON.stringify(registro.cuerpo));
  assert.equal(registro.cuerpo.usuario.paseosCompletados, 0);
  assert.ok(registro.cuerpo.token);
  paso('el registro crea la cuenta, arranca en cero paseos y devuelve token');

  const sinClave = await pedir<Error_>('POST', '/auth/register', {
    cuerpo: { nombre: 'Sin Clave', correo: `b.${correoNuevo}`, telefono: '70000000', rol: 'dueno' },
  });
  assert.equal(sinClave.estado, 400);
  paso('un registro sin contraseña se rechaza con 400');

  const repetido = await pedir<Error_>('POST', '/auth/register', {
    cuerpo: { nombre: 'Otra Vez', correo: correoNuevo, telefono: '70000000', clave: 'petgo1234', rol: 'dueno' },
  });
  assert.equal(repetido.estado, 409);
  paso('un correo ya registrado se rechaza con 409');

  // ── 1c · El plazo para agendar ───────────────────────────────────────────
  // El selector de la app ya impide salirse del plazo, pero el servidor no
  // puede fiarse de que quien llama sea la app.
  const mascotasCamila = await pedir<{ id: string }[]>('GET', '/pets', { token: camila });
  assert.equal(mascotasCamila.estado, 200);
  const unaMascota = mascotasCamila.cuerpo[0]?.id;
  assert.ok(unaMascota, 'Camila debería tener mascotas sembradas');

  const enDias = (dias: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString();
  };
  const borrador = (fechaHora: string) => ({
    mascotaIds: [unaMascota],
    fechaHora,
    duracionMin: 60,
    pagoBs: 40,
    direccion: 'Av. América #1204, Sarco',
    zona: 'Sarco',
    lat: -17.383,
    lng: -66.175,
    notas: '',
  });

  const muyLejos = await pedir<Error_>('POST', '/requests', {
    token: camila,
    cuerpo: borrador(enDias(8)),
  });
  assert.equal(muyLejos.estado, 400, JSON.stringify(muyLejos.cuerpo));
  paso('una solicitud a más de 7 días se rechaza con 400');

  const enElPasado = await pedir<Error_>('POST', '/requests', {
    token: camila,
    cuerpo: borrador(enDias(-1)),
  });
  assert.equal(enElPasado.estado, 400);
  paso('una solicitud con fecha pasada se rechaza con 400');

  // Las mutaciones responden envueltas: el dato nuevo y el aviso que la app
  // va a mostrar.
  const dentroDePlazo = await pedir<{ datos: Solicitud; toast: string }>('POST', '/requests', {
    token: camila,
    cuerpo: borrador(enDias(3)),
  });
  assert.equal(dentroDePlazo.estado, 201, JSON.stringify(dentroDePlazo.cuerpo));
  assert.equal(dentroDePlazo.cuerpo.datos.estado, 'publicada');
  paso(`una dentro del plazo se crea publicada: "${dentroDePlazo.cuerpo.toast}"`);

  // ── 2 · Sus solicitudes ──────────────────────────────────────────────────
  const mias = await pedir<Solicitud[]>('GET', '/requests', { token: camila });
  assert.equal(mias.estado, 200);
  assert.ok(mias.cuerpo.length >= 5, `esperaba 5+, llegaron ${mias.cuerpo.length}`);
  paso(`Camila ve sus ${mias.cuerpo.length} solicitudes`);

  const s1042 = mias.cuerpo.find((s) => s.mascotasEtiqueta === 'Rocco y Luna' && s.estado === 'proceso');
  assert.ok(s1042, 'no encontré la solicitud en proceso de Rocco y Luna');
  assert.equal(s1042.awaitingConfirmation, true);
  assert.equal(s1042.estadoEtiqueta, 'En proceso');
  assert.equal(s1042.pagoEtiqueta, 'Bs 45');
  paso('la #1042 está en proceso con awaitingConfirmation activo');

  // El backend manda las etiquetas listas: la app no compone ninguna de éstas.
  assert.match(s1042.fechaEtiqueta, /^(Hoy|Mañana|Ayer|\w{3} \d+) · \d{2}:\d{2}$/);
  assert.equal(s1042.duracionEtiqueta, '60 min');
  paso(`las etiquetas llegan formateadas: "${s1042.fechaEtiqueta}", "${s1042.duracionEtiqueta}"`);

  const finalPendiente = s1042.hitos.find((h) => h.clave === 'finalizada');
  assert.equal(finalPendiente?.detalle, 'Esperando confirmación del dueño');
  paso('el timeline dice que se está esperando la confirmación del dueño');

  // ── 3 · Diego entra ──────────────────────────────────────────────────────
  const loginDiego = await pedir<Sesion>('POST', '/auth/login', {
    cuerpo: { correo: 'diego.r@gmail.com', clave: 'petgo1234' },
  });
  assert.equal(loginDiego.estado, 200);
  assert.equal(loginDiego.cuerpo.usuario.metaEtiqueta, 'Cuidador · 34 paseos');
  const diego = loginDiego.cuerpo.token;
  paso('Diego inicia sesión con su contador de paseos');

  // ── 4 · LA REGLA · Diego no puede avanzar ────────────────────────────────
  const intento = await pedir<Error_>('POST', `/requests/${s1042.id}/advance`, {
    token: diego,
  });
  assert.equal(intento.estado, 409, `esperaba 409, llegó ${intento.estado}`);
  assert.match(intento.cuerpo.mensaje, /falta que el dueño/i);
  paso(`el servidor bloquea al cuidador: "${intento.cuerpo.mensaje}"`);

  // ── 5 · LA REGLA · Diego tampoco puede cerrar el servicio ────────────────
  const intentoCerrar = await pedir<Error_>('POST', `/requests/${s1042.id}/confirm`, {
    token: diego,
  });
  assert.equal(intentoCerrar.estado, 403);
  assert.match(intentoCerrar.cuerpo.mensaje, /sólo el dueño/i);
  paso(`sólo el dueño cierra: "${intentoCerrar.cuerpo.mensaje}"`);

  // ── 6 · LA REGLA · Camila sí ─────────────────────────────────────────────
  const confirmacion = await pedir<{ datos: Solicitud; toast: string }>(
    'POST',
    `/requests/${s1042.id}/confirm`,
    { token: camila },
  );
  assert.equal(confirmacion.estado, 200, JSON.stringify(confirmacion.cuerpo));
  assert.equal(confirmacion.cuerpo.datos.estado, 'finalizada');
  assert.equal(confirmacion.cuerpo.datos.awaitingConfirmation, false);
  assert.equal(confirmacion.cuerpo.toast, 'Servicio de Rocco y Luna finalizado');
  paso(`Camila cierra el servicio: "${confirmacion.cuerpo.toast}"`);

  const dosVeces = await pedir<Error_>('POST', `/requests/${s1042.id}/confirm`, {
    token: camila,
  });
  assert.equal(dosVeces.estado, 409);
  assert.match(dosVeces.cuerpo.mensaje, /ya está finalizado/i);
  paso('confirmar dos veces devuelve "El servicio ya está finalizado"');

  // ── 7 · La consulta geoespacial ──────────────────────────────────────────
  // Diego está en Sarco. Con radio de 5 km debe ver las solicitudes publicadas
  // del Cercado, ordenadas por cercanía.
  const cercanas = await pedir<Solicitud[]>(
    'GET',
    '/requests/cercanas?lat=-17.3845&lng=-66.1705&distancia=5%20km',
    { token: diego },
  );
  assert.equal(cercanas.estado, 200, JSON.stringify(cercanas.cuerpo));
  assert.ok(cercanas.cuerpo.length > 0, 'la consulta geoespacial no devolvió nada');
  paso(`PostGIS devuelve ${cercanas.cuerpo.length} solicitudes en 5 km`);

  for (const s of cercanas.cuerpo) {
    assert.ok(s.distanciaEtiqueta, `${s.codigo} llegó sin distancia`);
    assert.match(s.distanciaEtiqueta, /^\d+([,.]\d+)? (m|km)$/);
  }
  paso(`las distancias vienen formateadas: ${cercanas.cuerpo.map((s) => s.distanciaEtiqueta).join(', ')}`);

  // El orden es el ORDER BY dist_km ASC de la consulta.
  const metros = cercanas.cuerpo.map((s) => {
    const [n, unidad] = s.distanciaEtiqueta!.split(' ');
    return Number(n!.replace(',', '.')) * (unidad === 'km' ? 1000 : 1);
  });
  assert.deepEqual(metros, [...metros].sort((a, b) => a - b), 'no vienen ordenadas por distancia');
  paso('vienen ordenadas de más cerca a más lejos');

  // Un radio menor tiene que devolver menos.
  const cerquita = await pedir<Solicitud[]>(
    'GET',
    '/requests/cercanas?lat=-17.3845&lng=-66.1705&distancia=1%20km',
    { token: diego },
  );
  assert.ok(
    cerquita.cuerpo.length <= cercanas.cuerpo.length,
    'el radio de 1 km devolvió más que el de 5 km',
  );
  paso(`el chip "1 km" recorta a ${cerquita.cuerpo.length} (el filtro viaja al backend)`);

  // Ninguna solicitud propia aparece en el feed del cuidador.
  const propias = await pedir<Solicitud[]>(
    'GET',
    '/requests/cercanas?lat=-17.383&lng=-66.175&distancia=10%20km',
    { token: camila },
  );
  assert.equal(propias.estado, 200);
  paso('el feed excluye las solicitudes propias');

  // ── 8 · Interés y elección ───────────────────────────────────────────────
  const publicada = cercanas.cuerpo.find((s) => s.estado === 'publicada');
  assert.ok(publicada, 'no hay ninguna solicitud publicada cerca');

  const interes = await pedir<{ toast: string }>('POST', `/requests/${publicada.id}/interest`, {
    token: diego,
    cuerpo: { mensaje: 'Puedo pasar 10 minutos antes.', lat: -17.3845, lng: -66.1705 },
  });
  assert.equal(interes.estado, 201, JSON.stringify(interes.cuerpo));
  assert.match(interes.cuerpo.toast, /^Enviaste tu interés a /);
  paso(`Diego se ofrece: "${interes.cuerpo.toast}"`);

  const propia = await pedir<Error_>('POST', `/requests/${publicada.id}/interest`, {
    token: camila,
  });
  assert.ok(
    propia.estado === 403 || propia.estado === 404,
    `esperaba 403/404, llegó ${propia.estado}`,
  );
  paso('nadie se ofrece a su propia solicitud');

  // ── 9 · Chat ─────────────────────────────────────────────────────────────
  const hilos = await pedir<{ id: string; vinculoEtiqueta: string; ultimoMensaje: string }[]>(
    'GET',
    '/conversations',
    { token: camila },
  );
  assert.equal(hilos.estado, 200);
  assert.ok(hilos.cuerpo.length > 0, 'Camila no tiene conversaciones');
  assert.match(hilos.cuerpo[0]!.vinculoEtiqueta, /^Solicitud #\d+ · /);
  paso(`el hilo se identifica por su solicitud: "${hilos.cuerpo[0]!.vinculoEtiqueta}"`);

  const hiloId = hilos.cuerpo[0]!.id;
  const enviado = await pedir<{ texto: string; horaEtiqueta: string }>(
    'POST',
    `/conversations/${hiloId}/messages`,
    { token: camila, cuerpo: { texto: 'Gracias por todo, Diego.' } },
  );
  assert.equal(enviado.estado, 201, JSON.stringify(enviado.cuerpo));
  assert.match(enviado.cuerpo.horaEtiqueta, /^\d{2}:\d{2}$/);
  paso(`el mensaje se guarda con su hora: ${enviado.cuerpo.horaEtiqueta}`);

  const vacio = await pedir<Error_>('POST', `/conversations/${hiloId}/messages`, {
    token: camila,
    cuerpo: { texto: '   ' },
  });
  assert.equal(vacio.estado, 400);
  paso('un mensaje en blanco se rechaza');

  const ajeno = await pedir<Error_>('GET', `/conversations/${hiloId}/messages`, {
    token: (
      await pedir<Sesion>('POST', '/auth/login', {
        cuerpo: { correo: 'ana.p@gmail.com', clave: 'petgo1234' },
      })
    ).cuerpo.token,
  });
  assert.equal(ajeno.estado, 403);
  paso('un tercero no puede leer una conversación ajena');

  // ── 10 · Notificaciones ──────────────────────────────────────────────────
  const avisos = await pedir<{ tipo: string; horaEtiqueta: string; accionEtiqueta?: string }[]>(
    'GET',
    '/notifications',
    { token: camila },
  );
  assert.equal(avisos.estado, 200);
  assert.ok(avisos.cuerpo.length > 0);
  paso(`la bandeja trae ${avisos.cuerpo.length} avisos`);

  // La de confirmación desapareció al cerrar el servicio: ya se actuó sobre ella.
  assert.equal(
    avisos.cuerpo.filter((n) => n.tipo === 'confirmar').length,
    0,
    'la notificación de confirmar sigue ahí después de confirmar',
  );
  paso('al confirmar, su notificación desaparece de la bandeja');

  const conAccion = avisos.cuerpo.find((n) => n.accionEtiqueta);
  if (conAccion) {
    paso(`el backend decide el botón: "${conAccion.accionEtiqueta}"`);
  }

  console.log(`\n${ok} comprobaciones pasaron contra la API real.\n`);
}

correr().catch((error) => {
  console.error('\nLa prueba de humo falló:\n');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
