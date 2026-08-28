/**
 * Contrato entre la app y el backend.
 *
 * Comprueba que **toda ruta que pide `petgo-app/src/api/http.ts` existe en el
 * servidor**. Es la única costura del proyecto que ni el typecheck ni las
 * pruebas de reglas pueden cubrir: los dos proyectos compilan por separado, y
 * una ruta mal escrita en el cliente sólo se descubre cuando alguien toca ese
 * botón en el teléfono.
 *
 * Lo que **no** comprueba: la forma del JSON. Eso lo cubre `humo.mts` contra el
 * servidor levantado.
 *
 * No necesita base de datos ni servidor: lee los dos árboles de código.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../..');

/** Dónde monta `app.ts` cada router. */
const MONTAJES: Record<string, string> = {
  'petgo-backend/src/modules/auth/auth.routes.ts': '/auth',
  'petgo-backend/src/modules/pets/pets.routes.ts': '/pets',
  'petgo-backend/src/modules/requests/requests.routes.ts': '/requests',
  'petgo-backend/src/modules/interests/interests.routes.ts': '/requests',
  'petgo-backend/src/modules/messages/messages.routes.ts': '/conversations',
  'petgo-backend/src/modules/notifications/notifications.routes.ts': '/notifications',
};

const CLIENTE = 'petgo-app/src/api/http.ts';

/** Los nombres de parámetro no importan: `/requests/:id` y `/requests/:x` son la misma ruta. */
const normalizar = (ruta: string): string =>
  (ruta.replace(/\$\{[^}]+\}/g, ':p').replace(/:\w+/g, ':p').replace(/\/$/, '') || '/');

function rutasDelCliente(): string[] {
  const src = readFileSync(resolve(RAIZ, CLIENTE), 'utf8');
  // El genérico de `pedir<...>` puede llevar genéricos anidados, así que se
  // salta entero en vez de intentar equilibrar los `<>`.
  const patron = /pedir(?:<[\s\S]*?>)?\(\s*\n?\s*'(GET|POST|PATCH|DELETE)',\s*\n?\s*[`'"]([^`'"?]*)/g;
  return [
    ...new Set(
      [...src.matchAll(patron)].map(([, metodo, ruta]) => `${metodo} ${normalizar(ruta!)}`),
    ),
  ].sort();
}

function rutasDelServidor(): Set<string> {
  const expuestas = new Set<string>();
  for (const [archivo, prefijo] of Object.entries(MONTAJES)) {
    const src = readFileSync(resolve(RAIZ, archivo), 'utf8');
    const patron = /rutas\w+\.(get|post|patch|delete)\(\s*\n?\s*'([^']+)'/g;
    for (const [, metodo, ruta] of src.matchAll(patron)) {
      expuestas.add(`${metodo!.toUpperCase()} ${normalizar(prefijo + ruta!)}`);
    }
  }
  return expuestas;
}

const cliente = rutasDelCliente();
const servidor = rutasDelServidor();

console.log(`\nContrato app ↔ backend\n`);

// Un chequeo que no encuentra nada no es un chequeo: si el patrón deja de
// funcionar, esta comprobación falla en vez de pasar en silencio.
assert.ok(cliente.length >= 20, `sólo detecté ${cliente.length} rutas en el cliente`);
assert.ok(servidor.size >= 20, `sólo detecté ${servidor.size} rutas en el servidor`);

const huerfanas = cliente.filter((r) => !servidor.has(r));

for (const ruta of cliente) {
  console.log(`  ${servidor.has(ruta) ? '✓' : '✗'} ${ruta}`);
}

const sinUsar = [...servidor].filter((r) => !cliente.includes(r)).sort();
if (sinUsar.length > 0) {
  // No es un error: hay endpoints escritos para pantallas que el handoff
  // todavía no diseñó (editar mascota, refrescar perfil).
  console.log('\n  Expuestas y aún sin usar por la app:');
  for (const ruta of sinUsar) console.log(`    · ${ruta}`);
}

assert.deepEqual(huerfanas, [], `rutas del cliente que el servidor no expone: ${huerfanas.join(', ')}`);

console.log(
  `\n  Las ${cliente.length} rutas del cliente existen en el servidor.\n`,
);
