/**
 * Reglas de negocio del backend.
 *
 * Éstas son las que mandan: la app tiene un espejo de las mismas reglas, pero
 * quien autoriza una transición es `src/domain/status.ts`. Si estas dos suites
 * discrepan, la que está mal es la del cliente.
 *
 * Corren sin base de datos y sin `.env`, con el borrado de tipos de Node.
 */
import assert from 'node:assert/strict';

import { EstadoServicio, Rol } from '../src/generated/prisma/enums.js';
import { ErrorHttp } from '../src/lib/errores.js';
import {
  SECUENCIA,
  esTerminal,
  exigirParticipante,
  exigirPuedeAceptarInteresado,
  exigirPuedeCancelar,
  exigirPuedeConfirmar,
  exigirPuedeManifestarInteres,
  papelEn,
  resolverAccionCuidador,
  siguienteEstado,
  tieneConversacion,
  type SolicitudParaReglas,
} from '../src/domain/status.js';
import {
  bolivianos,
  distancia,
  distanciaLarga,
  metaUsuario,
  plural,
  primerNombre,
  unirNombres,
} from '../src/lib/texto.js';
import {
  diaRelativo,
  fechaHora,
  haceCuanto,
  hora,
  horaODia,
  inicioDelDia,
} from '../src/lib/fechas.js';

let ok = 0;
const prueba = (nombre: string, fn: () => void) => {
  fn();
  ok += 1;
  console.log(`  ✓ ${nombre}`);
};

const DUENO = 'u-dueno';
const CUIDADOR = 'u-cuidador';
const EXTRANO = 'u-extrano';

const sol = (over: Partial<SolicitudParaReglas> = {}): SolicitudParaReglas => ({
  estado: EstadoServicio.publicada,
  awaitingConfirmation: false,
  duenoId: DUENO,
  cuidadorId: null,
  ...over,
});

/** Comprueba que algo lanza un `ErrorHttp` con el código y el mensaje esperados. */
function lanza(fn: () => unknown, estado: number, fragmento: string) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof ErrorHttp, `esperaba ErrorHttp, llegó ${error}`);
    assert.equal(error.estado, estado, `código HTTP: ${error.message}`);
    assert.ok(
      error.message.toLowerCase().includes(fragmento.toLowerCase()),
      `esperaba un mensaje con "${fragmento}", llegó "${error.message}"`,
    );
    return;
  }
  assert.fail(`esperaba que lanzara ${estado} con "${fragmento}"`);
}

console.log('\nReglas de estado del servicio\n');

prueba('regla 1 · la secuencia y los estados terminales', () => {
  assert.deepEqual(SECUENCIA, [
    'publicada',
    'aceptada',
    'programada',
    'proceso',
    'finalizada',
  ]);
  assert.equal(siguienteEstado(EstadoServicio.publicada), EstadoServicio.aceptada);
  assert.equal(siguienteEstado(EstadoServicio.finalizada), null);
  assert.equal(esTerminal(EstadoServicio.finalizada), true);
  assert.equal(esTerminal(EstadoServicio.cancelada), true);
  assert.equal(esTerminal(EstadoServicio.proceso), false);
});

prueba('el papel se deriva de la fila, no del rol del token', () => {
  const s = sol({ cuidadorId: CUIDADOR });
  assert.equal(papelEn(s, DUENO), Rol.dueno);
  assert.equal(papelEn(s, CUIDADOR), Rol.cuidador);
  assert.equal(papelEn(s, EXTRANO), null);
});

prueba('regla 2 · el cuidador avanza hasta proceso', () => {
  for (const [desde, hasta] of [
    [EstadoServicio.publicada, EstadoServicio.aceptada],
    [EstadoServicio.aceptada, EstadoServicio.programada],
    [EstadoServicio.programada, EstadoServicio.proceso],
  ] as const) {
    const accion = resolverAccionCuidador(
      sol({ estado: desde, cuidadorId: CUIDADOR }),
      CUIDADOR,
    );
    assert.deepEqual(accion, { tipo: 'avanzar', siguiente: hasta });
  }
});

prueba('regla 2 · en proceso la acción marca el fin del paseo, no avanza', () => {
  const accion = resolverAccionCuidador(
    sol({ estado: EstadoServicio.proceso, cuidadorId: CUIDADOR }),
    CUIDADOR,
  );
  assert.deepEqual(accion, { tipo: 'terminarPaseo' });
});

prueba('regla 3 · el cuidador nunca alcanza finalizada avanzando', () => {
  // El único camino a `finalizada` es POST /confirm, del dueño. Desde `proceso`
  // la acción del cuidador es terminar el paseo, no cerrar el servicio.
  const accion = resolverAccionCuidador(
    sol({ estado: EstadoServicio.proceso, cuidadorId: CUIDADOR }),
    CUIDADOR,
  );
  assert.notEqual(accion.tipo, 'avanzar');
});

prueba('regla 5 · con awaitingConfirmation el cuidador queda bloqueado', () => {
  lanza(
    () =>
      resolverAccionCuidador(
        sol({
          estado: EstadoServicio.proceso,
          cuidadorId: CUIDADOR,
          awaitingConfirmation: true,
        }),
        CUIDADOR,
      ),
    409,
    'falta que el dueño',
  );
});

prueba('sólo el cuidador asignado avanza el estado', () => {
  const s = sol({ estado: EstadoServicio.aceptada, cuidadorId: CUIDADOR });
  lanza(() => resolverAccionCuidador(s, DUENO), 403, 'sólo el cuidador');
  lanza(() => resolverAccionCuidador(s, EXTRANO), 403, 'sólo el cuidador');
});

prueba('un servicio finalizado no se puede avanzar', () => {
  lanza(
    () =>
      resolverAccionCuidador(
        sol({ estado: EstadoServicio.finalizada, cuidadorId: CUIDADOR }),
        CUIDADOR,
      ),
    409,
    'ya está finalizado',
  );
});

prueba('regla 3 · sólo el dueño confirma, y sólo tras el fin del paseo', () => {
  const esperando = sol({
    estado: EstadoServicio.proceso,
    cuidadorId: CUIDADOR,
    awaitingConfirmation: true,
  });

  // El dueño sí puede: no lanza.
  exigirPuedeConfirmar(esperando, DUENO);

  lanza(() => exigirPuedeConfirmar(esperando, CUIDADOR), 403, 'sólo el dueño');
  lanza(() => exigirPuedeConfirmar(esperando, EXTRANO), 403, 'sólo el dueño');

  // Sin la bandera no hay nada que confirmar.
  lanza(
    () =>
      exigirPuedeConfirmar(
        sol({ estado: EstadoServicio.proceso, cuidadorId: CUIDADOR }),
        DUENO,
      ),
    409,
    'todavía no marcó',
  );

  // Y un servicio ya cerrado no se vuelve a cerrar.
  lanza(
    () =>
      exigirPuedeConfirmar(
        sol({ estado: EstadoServicio.finalizada, awaitingConfirmation: true }),
        DUENO,
      ),
    409,
    'ya está finalizado',
  );
});

prueba('regla 4 · ambas partes cancelan antes de un estado terminal', () => {
  for (const estado of [
    EstadoServicio.publicada,
    EstadoServicio.aceptada,
    EstadoServicio.programada,
    EstadoServicio.proceso,
  ]) {
    const s = sol({ estado, cuidadorId: CUIDADOR });
    exigirPuedeCancelar(s, DUENO);
    exigirPuedeCancelar(s, CUIDADOR);
  }

  // Un tercero no.
  lanza(
    () => exigirPuedeCancelar(sol({ cuidadorId: CUIDADOR }), EXTRANO),
    403,
    'no participas',
  );

  lanza(
    () => exigirPuedeCancelar(sol({ estado: EstadoServicio.finalizada }), DUENO),
    409,
    'ya está finalizado',
  );
});

prueba('el interés sólo cabe en una solicitud publicada, libre y ajena', () => {
  exigirPuedeManifestarInteres(sol(), CUIDADOR);

  lanza(
    () => exigirPuedeManifestarInteres(sol(), DUENO),
    403,
    'tu propia solicitud',
  );

  lanza(
    () =>
      exigirPuedeManifestarInteres(
        sol({ estado: EstadoServicio.aceptada, cuidadorId: 'otro' }),
        CUIDADOR,
      ),
    409,
    'ya tiene cuidador',
  );
});

prueba('el conflicto de solicitud ya tomada lleva la clave que la app pinta', () => {
  try {
    exigirPuedeManifestarInteres(sol({ cuidadorId: 'otro' }), CUIDADOR);
    assert.fail('esperaba un conflicto');
  } catch (error) {
    assert.ok(error instanceof ErrorHttp);
    assert.equal(error.clave, 'yaTomada');
  }
});

prueba('el dueño elige cuidador sólo mientras siga publicada', () => {
  exigirPuedeAceptarInteresado(sol(), DUENO);
  lanza(() => exigirPuedeAceptarInteresado(sol(), CUIDADOR), 403, 'sólo el dueño');
  lanza(
    () => exigirPuedeAceptarInteresado(sol({ estado: EstadoServicio.aceptada }), DUENO),
    409,
    'ya tiene cuidador',
  );
});

prueba('hay hilo de chat en cuanto hay cuidador asignado', () => {
  assert.equal(tieneConversacion(sol({ cuidadorId: CUIDADOR })), true);
  assert.equal(tieneConversacion(sol()), false);

  const s = sol({ cuidadorId: CUIDADOR });
  assert.equal(exigirParticipante(s, DUENO), Rol.dueno);
  assert.equal(exigirParticipante(s, CUIDADOR), Rol.cuidador);
  lanza(() => exigirParticipante(s, EXTRANO), 403, 'no participas');
});

console.log('\nEtiquetas que consume la app\n');

prueba('los nombres de mascota se unen por " y "', () => {
  assert.equal(unirNombres(['Rocco']), 'Rocco');
  assert.equal(unirNombres(['Rocco', 'Luna']), 'Rocco y Luna');
  assert.equal(unirNombres(['Rocco', 'Luna', 'Kira']), 'Rocco, Luna y Kira');
  assert.equal(unirNombres([]), '');
});

prueba('pluralización en español', () => {
  assert.equal(plural(1, 'mascota', 'mascotas'), '1 mascota');
  assert.equal(plural(2, 'mascota', 'mascotas'), '2 mascotas');
  assert.equal(plural(0, 'solicitud', 'solicitudes'), '0 solicitudes');
});

prueba('montos y distancias con la convención boliviana', () => {
  assert.equal(bolivianos(45), 'Bs 45');
  assert.equal(distancia(600), '600 m');
  assert.equal(distancia(1200), '1,2 km');
  assert.equal(distanciaLarga(600), 'a 600 m del punto de recogida');
});

prueba('la etiqueta de usuario concuerda en género', () => {
  assert.equal(metaUsuario('Camila Vargas', 'dueno', null), 'Dueña de mascota');
  assert.equal(metaUsuario('Javier Terceros', 'dueno', null), 'Dueño de mascota');
  assert.equal(metaUsuario('Diego Rojas', 'cuidador', 34), 'Cuidador · 34 paseos');
  assert.equal(metaUsuario('Ana Peredo', 'cuidador', 12), 'Cuidadora · 12 paseos');
  assert.equal(metaUsuario('Ana Peredo', 'cuidador', 1), 'Cuidadora · 1 paseo');
  assert.equal(primerNombre('Camila Vargas'), 'Camila');
});

console.log('\nFechas en hora de Bolivia\n');

prueba('la hora se lee en UTC−4, no en la del servidor', () => {
  // 2026-08-27T21:30:00Z son las 17:30 en Cochabamba.
  const instante = new Date('2026-08-27T21:30:00.000Z');
  assert.equal(hora(instante), '17:30');
});

prueba('un paseo nocturno no salta de día por culpa de UTC', () => {
  // 2026-08-27T02:00:00Z son las 22:00 del 26 en Bolivia: sigue siendo "ayer"
  // respecto al 27, no "hoy". Calculado en UTC diría lo contrario.
  const instante = new Date('2026-08-27T02:00:00.000Z');
  const referencia = new Date('2026-08-27T16:00:00.000Z'); // mediodía en Bolivia
  assert.equal(diaRelativo(instante, referencia), 'Ayer');
  assert.equal(hora(instante), '22:00');
});

prueba('"Hoy · 17:30" es la etiqueta de fecha principal', () => {
  const instante = new Date('2026-08-27T21:30:00.000Z');
  const referencia = new Date('2026-08-27T16:00:00.000Z');
  assert.equal(fechaHora(instante, referencia), 'Hoy · 17:30');
});

prueba('el inicio del día boliviano son las 04:00 UTC', () => {
  const instante = new Date('2026-08-27T21:30:00.000Z');
  assert.equal(inicioDelDia(instante).toISOString(), '2026-08-27T04:00:00.000Z');
});

prueba('la lista de conversaciones muestra hora hoy y día si no', () => {
  const referencia = new Date('2026-08-27T16:00:00.000Z'); // mediodía en Bolivia
  assert.equal(horaODia(new Date('2026-08-27T21:35:00.000Z'), referencia), '17:35');
  assert.equal(horaODia(new Date('2026-08-26T21:35:00.000Z'), referencia), 'Ayer');
});

prueba('la antigüedad de una notificación se lee en palabras', () => {
  const ahora = new Date('2026-08-27T16:00:00.000Z');
  assert.equal(haceCuanto(new Date('2026-08-27T15:55:00.000Z'), ahora), 'Hace 5 min');
  assert.equal(haceCuanto(new Date('2026-08-27T13:00:00.000Z'), ahora), 'Hace 3 h');
  assert.equal(haceCuanto(new Date('2026-08-27T15:59:40.000Z'), ahora), 'Ahora');
  assert.match(haceCuanto(new Date('2026-08-25T13:00:00.000Z'), ahora), /· \d{2}:\d{2}$/);
});

console.log(`\n${ok} comprobaciones pasaron.\n`);
