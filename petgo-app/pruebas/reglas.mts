/**
 * Comprobación de las reglas de negocio y de los formateadores.
 * Se ejecuta con el borrado de tipos de Node 24, sin bundler.
 */
import assert from 'node:assert/strict';

import {
  SECUENCIA,
  cuidadorPuedeAvanzar,
  duenoPuedeConfirmar,
  esTerminal,
  etiquetaAccionCuidador,
  marcaFinDePaseo,
  puedeCancelar,
  puedeElegirCuidador,
  puedeManifestarInteres,
  siguienteEstado,
  tieneConversacion,
} from '../src/api/estados.ts';

import {
  bolivianos,
  distancia,
  distanciaLarga,
  duracion,
  pagoMinimo,
  plural,
  radioEnMetros,
  unirNombres,
} from '../src/api/mock/formato.ts';

import {
  DIAS_VISIBLES,
  VENTANA_MS,
  combinar,
  diasElegibles,
  inicioDeDia,
  mismoDia,
  proximaMediaHora,
} from '../src/utiles/agenda.ts';

import {
  CENTRO_CERCADO,
  distanciaEnMetros,
  estaEnElCercado,
  origenDeBusqueda,
} from '../src/utiles/geo.ts';

let ok = 0;
const prueba = (nombre: string, fn: () => void) => {
  fn();
  ok += 1;
  console.log(`  ✓ ${nombre}`);
};

/** Solicitud mínima con la forma que consumen los predicados. */
const sol = (over: Record<string, unknown> = {}) =>
  ({
    id: 's-1',
    estado: 'publicada',
    awaitingConfirmation: false,
    duenoId: 'u-dueno',
    cuidadorId: null,
    ...over,
  }) as never;

console.log('\nReglas de estado del servicio\n');

prueba('la secuencia es publicada → aceptada → programada → proceso → finalizada', () => {
  assert.deepEqual(SECUENCIA, ['publicada', 'aceptada', 'programada', 'proceso', 'finalizada']);
  assert.equal(siguienteEstado('publicada'), 'aceptada');
  assert.equal(siguienteEstado('proceso'), 'finalizada');
  assert.equal(siguienteEstado('finalizada'), null);
});

prueba('finalizada y cancelada son terminales', () => {
  assert.equal(esTerminal('finalizada'), true);
  assert.equal(esTerminal('cancelada'), true);
  assert.equal(esTerminal('proceso'), false);
});

prueba('regla 2 · el cuidador avanza hasta proceso', () => {
  assert.equal(cuidadorPuedeAvanzar(sol({ estado: 'aceptada', cuidadorId: 'u-c' })), true);
  assert.equal(cuidadorPuedeAvanzar(sol({ estado: 'programada', cuidadorId: 'u-c' })), true);
  assert.equal(cuidadorPuedeAvanzar(sol({ estado: 'proceso', cuidadorId: 'u-c' })), true);
  // Sin cuidador asignado no hay nadie que pueda avanzar.
  assert.equal(cuidadorPuedeAvanzar(sol({ estado: 'aceptada', cuidadorId: null })), false);
});

prueba('regla 2 · en proceso la acción marca el fin del paseo, no avanza', () => {
  const enProceso = sol({ estado: 'proceso', cuidadorId: 'u-c' });
  assert.equal(marcaFinDePaseo(enProceso), true);
  assert.equal(etiquetaAccionCuidador(enProceso), 'Marcar como terminado');

  const antes = sol({ estado: 'aceptada', cuidadorId: 'u-c' });
  assert.equal(marcaFinDePaseo(antes), false);
  assert.equal(etiquetaAccionCuidador(antes), 'Actualizar estado');
});

prueba('regla 5 · con awaitingConfirmation el cuidador no avanza más', () => {
  const esperando = sol({ estado: 'proceso', cuidadorId: 'u-c', awaitingConfirmation: true });
  assert.equal(cuidadorPuedeAvanzar(esperando), false);
  assert.equal(marcaFinDePaseo(esperando), false);
});

prueba('regla 3 · sólo el dueño cierra, y sólo si el cuidador ya terminó', () => {
  assert.equal(
    duenoPuedeConfirmar(sol({ estado: 'proceso', cuidadorId: 'u-c', awaitingConfirmation: true })),
    true,
  );
  // Sin la bandera no hay nada que confirmar.
  assert.equal(duenoPuedeConfirmar(sol({ estado: 'proceso', cuidadorId: 'u-c' })), false);
  // Un servicio ya cerrado no se vuelve a cerrar.
  assert.equal(
    duenoPuedeConfirmar(sol({ estado: 'finalizada', awaitingConfirmation: true })),
    false,
  );
});

prueba('regla 1 · finalizada no es alcanzable avanzando', () => {
  // El único camino a finalizada es POST /confirm, del dueño. La secuencia lo
  // lista, pero avanzarEstado corta antes.
  const enProceso = sol({ estado: 'proceso', cuidadorId: 'u-c' });
  assert.equal(marcaFinDePaseo(enProceso), true, 'proceso no debe saltar a finalizada');
});

prueba('regla 4 · ambas partes cancelan antes de un estado terminal', () => {
  for (const estado of ['publicada', 'aceptada', 'programada', 'proceso']) {
    assert.equal(puedeCancelar(sol({ estado })), true, estado);
  }
  assert.equal(puedeCancelar(sol({ estado: 'finalizada' })), false);
  assert.equal(puedeCancelar(sol({ estado: 'cancelada' })), false);
});

prueba('el interés sólo cabe en una solicitud publicada y ajena', () => {
  assert.equal(puedeManifestarInteres(sol({ estado: 'publicada' }), 'u-c'), true);
  assert.equal(puedeManifestarInteres(sol({ estado: 'aceptada' }), 'u-c'), false);
  assert.equal(
    puedeManifestarInteres(sol({ estado: 'publicada', cuidadorId: 'u-otro' }), 'u-c'),
    false,
  );
  // Nadie se ofrece a su propia solicitud.
  assert.equal(puedeManifestarInteres(sol({ estado: 'publicada' }), 'u-dueno'), false);
});

prueba('el dueño elige cuidador sólo mientras siga publicada', () => {
  assert.equal(puedeElegirCuidador(sol({ estado: 'publicada' }), 'dueno'), true);
  assert.equal(puedeElegirCuidador(sol({ estado: 'aceptada' }), 'dueno'), false);
  assert.equal(puedeElegirCuidador(sol({ estado: 'publicada' }), 'cuidador'), false);
});

prueba('hay hilo de chat en cuanto hay cuidador asignado', () => {
  assert.equal(tieneConversacion(sol({ cuidadorId: 'u-c' })), true);
  assert.equal(tieneConversacion(sol({ cuidadorId: null })), false);
});

console.log('\nEtiquetas que produce el backend\n');

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

prueba('montos y duraciones', () => {
  assert.equal(bolivianos(45), 'Bs 45');
  assert.equal(duracion(60), '60 min');
});

prueba('distancias con coma decimal, como en el handoff', () => {
  assert.equal(distancia(600), '600 m');
  assert.equal(distancia(1200), '1,2 km');
  assert.equal(distancia(1400), '1,4 km');
  assert.equal(distanciaLarga(600), 'a 600 m del punto de recogida');
});

prueba('los chips de filtro se traducen a parámetros de consulta', () => {
  assert.equal(radioEnMetros('5 km'), 5000);
  assert.equal(radioEnMetros('10 km'), 10000);
  assert.equal(radioEnMetros('1 km'), 1000);
  assert.equal(pagoMinimo('Bs 40+'), 40);
  assert.equal(pagoMinimo('Cualquiera'), null);
});

console.log('\nGeolocalización\n');

prueba('la distancia entre dos puntos del Cercado sale en el orden correcto', () => {
  // Sarco (-17.383, -66.175) y Queru Queru (-17.376, -66.149): ~2,8 km.
  const metros = distanciaEnMetros(
    { lat: -17.383, lng: -66.175 },
    { lat: -17.376, lng: -66.149 },
  );
  assert.ok(metros > 2500 && metros < 3200, `esperaba ~2,8 km y salió ${Math.round(metros)} m`);
});

prueba('el mismo punto está a cero metros de sí mismo', () => {
  assert.equal(Math.round(distanciaEnMetros(CENTRO_CERCADO, CENTRO_CERCADO)), 0);
});

prueba('el Cercado se reconoce y La Paz no', () => {
  assert.equal(estaEnElCercado({ lat: -17.383, lng: -66.175 }), true);
  assert.equal(estaEnElCercado({ lat: -16.5, lng: -68.15 }), false, 'La Paz');
  // El emulador de Android arranca en California.
  assert.equal(estaEnElCercado({ lat: 37.42, lng: -122.08 }), false, 'Mountain View');
});

prueba('el origen de búsqueda cae al centro del Cercado fuera de Cochabamba', () => {
  const dentro = origenDeBusqueda({ lat: -17.383, lng: -66.175 });
  assert.equal(dentro.esReal, true);
  assert.equal(dentro.origen.lat, -17.383);

  const fuera = origenDeBusqueda({ lat: 37.42, lng: -122.08 });
  assert.equal(fuera.esReal, false);
  assert.deepEqual(fuera.origen, CENTRO_CERCADO);

  const sinPermiso = origenDeBusqueda(null);
  assert.equal(sinPermiso.esReal, false);
  assert.deepEqual(sinPermiso.origen, CENTRO_CERCADO);
});


console.log('\nAgenda de paseos\n');

/** Un instante concreto, para que las pruebas no dependan de la hora de correrlas. */
const enPunto = (dia: number, h: number, m: number) => new Date(2026, 8, dia, h, m, 0, 0);

prueba('la tira ofrece siete días, el primero es hoy y cruza el fin de mes', () => {
  // Arrancar el 27 de septiembre no es casual: la tira acaba en octubre, que
  // es lo que obliga al rótulo del mes a seguir al día elegido en vez de ser
  // fijo.
  const dias = diasElegibles(enPunto(27, 18, 0));
  assert.equal(dias.length, DIAS_VISIBLES);
  assert.ok(mismoDia(dias[0], enPunto(27, 0, 0)));
  assert.ok(mismoDia(dias[6], new Date(2026, 9, 3)));
});

prueba('todos los días de la tira caben en la ventana del servidor, a cualquier hora', () => {
  // Es la razón de que la tira llegue a hoy+6 y no a hoy+7: el último día
  // tiene que ser válido también en su hora más tardía, y desde cualquier
  // hora de hoy. Con hoy+7 dejaría de serlo en cuanto pasara la medianoche.
  for (const minuto of [0, 1, 12 * 60, 23 * 60 + 59]) {
    const ahora = new Date(2026, 8, 27, 0, 0, 0, 0);
    ahora.setMinutes(minuto);
    const ultimo = diasElegibles(ahora)[DIAS_VISIBLES - 1];
    const masTarde = combinar(ultimo, new Date(2026, 8, 27, 23, 59));
    assert.ok(masTarde.getTime() - ahora.getTime() <= VENTANA_MS);
    assert.ok(masTarde.getTime() > ahora.getTime());
  }
});

prueba('la hora de arranque siempre queda por delante y en media hora en punto', () => {
  for (const [h, m] of [[18, 0], [18, 1], [18, 29], [18, 30], [18, 31], [23, 45]]) {
    const ahora = enPunto(27, h, m);
    const propuesta = proximaMediaHora(ahora);
    assert.ok(propuesta.getTime() > ahora.getTime());
    assert.ok(propuesta.getMinutes() === 0 || propuesta.getMinutes() === 30);
  }
});

prueba('pasada la última media hora del día, el arranque salta al día siguiente', () => {
  // Si el día se tomara de `new Date()` y la hora de aquí, a las 23:45 el
  // selector se abriría en hoy a las 00:00, que ya pasó.
  const arranque = proximaMediaHora(enPunto(27, 23, 45));
  assert.ok(mismoDia(inicioDeDia(arranque), enPunto(28, 0, 0)));
});

prueba('combinar toma el día de uno y la hora del otro, sin segundos', () => {
  const elegido = combinar(enPunto(30, 0, 0), enPunto(27, 17, 30));
  assert.equal(elegido.getDate(), 30);
  assert.equal(elegido.getHours(), 17);
  assert.equal(elegido.getMinutes(), 30);
  assert.equal(elegido.getSeconds(), 0);
});

console.log(`\n${ok} comprobaciones pasaron.\n`);
