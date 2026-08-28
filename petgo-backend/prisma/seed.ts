import bcrypt from 'bcryptjs';
import {
  EstadoServicio,
  Rol,
  Sexo,
  Tamano,
  TipoNotificacion,
} from '../src/generated/prisma/enums.js';
import { prisma } from '../src/lib/prisma.js';

/**
 * Datos de demostración.
 *
 * Reproducen el escenario del handoff, con las mismas personas y los mismos
 * códigos de solicitud. Lo importante es la **#1042**: queda en `proceso` con
 * `awaitingConfirmation` activo, que es el caso que demuestra la regla de
 * confirmación del cliente — el cuidador ya marcó el fin del paseo y el
 * servicio sigue abierto hasta que la dueña lo cierre.
 *
 * El seed es idempotente: borra y vuelve a sembrar, así que se puede correr
 * tantas veces como haga falta durante una demostración.
 */

const CLAVE = 'petgo1234';

/** Hoy, o dentro de N días, a una hora concreta. */
function enDias(dias: number, hh: number, mm: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/** Hace N minutos. Para fechar los eventos del timeline hacia atrás. */
function haceMinutos(minutos: number): Date {
  return new Date(Date.now() - minutos * 60_000);
}

async function sembrar() {
  console.log('Limpiando…');

  // El orden importa aunque haya `onDelete: Cascade`: borrar desde arriba deja
  // el log más legible y no depende de que las cascadas estén bien puestas.
  await prisma.notificacion.deleteMany();
  await prisma.mensaje.deleteMany();
  await prisma.interes.deleteMany();
  await prisma.eventoEstado.deleteMany();
  await prisma.solicitudMascota.deleteMany();
  await prisma.solicitud.deleteMany();
  await prisma.mascota.deleteMany();
  await prisma.usuario.deleteMany();

  // Los códigos del seed se fijan a mano más abajo, así que la secuencia tiene
  // que arrancar por encima del más alto: si no, la primera solicitud que
  // publique un usuario chocaría contra el índice único de `codigo`.
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "requests_codigo_seq" RESTART WITH 1049');

  const claveHash = await bcrypt.hash(CLAVE, 12);

  console.log('Usuarios…');

  const camila = await prisma.usuario.create({
    data: {
      nombre: 'Camila Vargas',
      correo: 'camila.v@gmail.com',
      telefono: '+591 712 44 903',
      claveHash,
      rol: Rol.dueno,
      zona: 'Sarco, Cercado',
      lat: -17.383,
      lng: -66.175,
    },
  });

  const diego = await prisma.usuario.create({
    data: {
      nombre: 'Diego Rojas',
      correo: 'diego.r@gmail.com',
      telefono: '+591 707 21 884',
      claveHash,
      rol: Rol.cuidador,
      zona: 'Sarco, Cercado',
      paseosCompletados: 34,
      lat: -17.3845,
      lng: -66.1705,
    },
  });

  const ana = await prisma.usuario.create({
    data: {
      nombre: 'Ana Peredo',
      correo: 'ana.p@gmail.com',
      telefono: '+591 764 90 112',
      claveHash,
      rol: Rol.cuidador,
      zona: 'Queru Queru, Cercado',
      paseosCompletados: 12,
      lat: -17.376,
      lng: -66.149,
    },
  });

  const luis = await prisma.usuario.create({
    data: {
      nombre: 'Luis Ovando',
      correo: 'luis.o@gmail.com',
      telefono: '+591 719 33 507',
      claveHash,
      rol: Rol.cuidador,
      zona: 'Cala Cala, Cercado',
      paseosCompletados: 21,
      lat: -17.369,
      lng: -66.16,
    },
  });

  // Dos dueños más, para que el mapa del cuidador tenga solicitudes ajenas.
  const mariana = await prisma.usuario.create({
    data: {
      nombre: 'Mariana Claros',
      correo: 'mariana.c@gmail.com',
      telefono: '+591 700 55 218',
      claveHash,
      rol: Rol.dueno,
      zona: 'Queru Queru, Cercado',
      lat: -17.376,
      lng: -66.149,
    },
  });

  const javier = await prisma.usuario.create({
    data: {
      nombre: 'Javier Terceros',
      correo: 'javier.t@gmail.com',
      telefono: '+591 776 12 340',
      claveHash,
      rol: Rol.dueno,
      zona: 'Cala Cala, Cercado',
      lat: -17.369,
      lng: -66.16,
    },
  });

  console.log('Mascotas…');

  const rocco = await prisma.mascota.create({
    data: {
      duenoId: camila.id,
      nombre: 'Rocco',
      raza: 'Border collie',
      edad: '3 años',
      sexo: Sexo.macho,
      tamano: Tamano.mediano,
      peso: '18 kg',
      notas: 'Jala al inicio del paseo, mejor con arnés. Timbre 2B.',
    },
  });

  const luna = await prisma.mascota.create({
    data: {
      duenoId: camila.id,
      nombre: 'Luna',
      raza: 'Mestiza',
      edad: '5 años',
      sexo: Sexo.hembra,
      tamano: Tamano.pequeno,
      peso: '9 kg',
      notas: 'Tranquila. No tolera otros perros grandes.',
    },
  });

  const momo = await prisma.mascota.create({
    data: {
      duenoId: camila.id,
      nombre: 'Momo',
      raza: 'Schnauzer',
      edad: '2 años',
      sexo: Sexo.macho,
      tamano: Tamano.pequeno,
      peso: '7 kg',
      notas: 'Muy activo, necesita ruta larga.',
    },
  });

  const kira = await prisma.mascota.create({
    data: {
      duenoId: mariana.id,
      nombre: 'Kira',
      raza: 'Labrador',
      edad: '4 años',
      sexo: Sexo.hembra,
      tamano: Tamano.grande,
      peso: '27 kg',
    },
  });

  const bruno = await prisma.mascota.create({
    data: {
      duenoId: mariana.id,
      nombre: 'Bruno',
      raza: 'Bóxer',
      edad: '3 años',
      sexo: Sexo.macho,
      tamano: Tamano.grande,
      peso: '29 kg',
    },
  });

  const toby = await prisma.mascota.create({
    data: {
      duenoId: javier.id,
      nombre: 'Toby',
      raza: 'Golden retriever',
      edad: '6 años',
      sexo: Sexo.macho,
      tamano: Tamano.grande,
      peso: '31 kg',
    },
  });

  const nala = await prisma.mascota.create({
    data: {
      duenoId: javier.id,
      nombre: 'Nala',
      raza: 'Golden retriever',
      edad: '6 años',
      sexo: Sexo.hembra,
      tamano: Tamano.grande,
      peso: '28 kg',
    },
  });

  console.log('Solicitudes…');

  /**
   * Crea una solicitud con sus mascotas y su historial de estados.
   *
   * El `codigo` se fija a mano en vez de dejarlo a la secuencia. El correlativo
   * es visible — la app muestra "#1042" — y la documentación, el handoff y la
   * demostración se refieren a solicitudes concretas por su número. Dejar que
   * los asigne el orden de inserción haría que cualquier reordenación del seed
   * desincronizara los papeles del proyecto respecto a la base.
   */
  async function crearSolicitud(datos: {
    codigo: number;
    duenoId: string;
    cuidadorId?: string;
    mascotaIds: string[];
    fechaHora: Date;
    duracionMin: number;
    pagoBs: number;
    direccion: string;
    zona: string;
    lat: number;
    lng: number;
    notas?: string;
    estado: EstadoServicio;
    awaitingConfirmation?: boolean;
    /** Minutos hacia atrás de cada transición, en el orden en que ocurrieron. */
    eventos: { estado: EstadoServicio; haceMin: number }[];
  }) {
    return prisma.solicitud.create({
      data: {
        codigo: datos.codigo,
        duenoId: datos.duenoId,
        cuidadorId: datos.cuidadorId ?? null,
        fechaHora: datos.fechaHora,
        duracionMin: datos.duracionMin,
        pagoBs: datos.pagoBs,
        direccion: datos.direccion,
        zona: datos.zona,
        lat: datos.lat,
        lng: datos.lng,
        notas: datos.notas ?? '',
        estado: datos.estado,
        awaitingConfirmation: datos.awaitingConfirmation ?? false,
        mascotas: { create: datos.mascotaIds.map((mascotaId) => ({ mascotaId })) },
        eventos: {
          create: datos.eventos.map((e) => ({
            estado: e.estado,
            creadoEn: haceMinutos(e.haceMin),
          })),
        },
      },
    });
  }

  // ── #1042 · El caso que demuestra la regla de confirmación ────────────────
  // Diego ya marcó el fin del paseo. El estado sigue en `proceso` y
  // `awaitingConfirmation` está activo: sólo Camila puede cerrarlo.
  const s1042 = await crearSolicitud({
    codigo: 1042,
    duenoId: camila.id,
    cuidadorId: diego.id,
    mascotaIds: [rocco.id, luna.id],
    fechaHora: enDias(0, 17, 30),
    duracionMin: 60,
    pagoBs: 45,
    direccion: 'Av. América #1204',
    zona: 'Sarco',
    lat: -17.383,
    lng: -66.175,
    notas: 'Rocco jala al inicio; llevar bolsas. Timbre 2B.',
    estado: EstadoServicio.proceso,
    awaitingConfirmation: true,
    eventos: [
      { estado: EstadoServicio.publicada, haceMin: 520 },
      { estado: EstadoServicio.aceptada, haceMin: 412 },
      { estado: EstadoServicio.programada, haceMin: 60 },
      { estado: EstadoServicio.proceso, haceMin: 42 },
    ],
  });

  // ── #1041 · Aceptada, esperando el día ────────────────────────────────────
  const s1041 = await crearSolicitud({
    codigo: 1041,
    duenoId: camila.id,
    cuidadorId: ana.id,
    mascotaIds: [momo.id],
    fechaHora: enDias(1, 8, 0),
    duracionMin: 45,
    pagoBs: 35,
    direccion: 'Calle Bolívar #340',
    zona: 'Centro',
    lat: -17.3935,
    lng: -66.157,
    notas: 'Momo necesita ruta larga; sale por la puerta principal.',
    estado: EstadoServicio.aceptada,
    eventos: [
      { estado: EstadoServicio.publicada, haceMin: 1_500 },
      { estado: EstadoServicio.aceptada, haceMin: 1_456 },
    ],
  });

  // ── #1040 · Publicada, con tres cuidadores interesados ────────────────────
  const s1040 = await crearSolicitud({
    codigo: 1040,
    duenoId: camila.id,
    mascotaIds: [rocco.id],
    fechaHora: enDias(2, 18, 0),
    duracionMin: 60,
    pagoBs: 40,
    direccion: 'Av. América #1204',
    zona: 'Sarco',
    lat: -17.383,
    lng: -66.175,
    notas: 'Paseo del lunes. Arnés propio, por favor.',
    estado: EstadoServicio.publicada,
    eventos: [{ estado: EstadoServicio.publicada, haceMin: 5 }],
  });

  // ── #1039 · Finalizada, para que el historial no esté vacío ───────────────
  await crearSolicitud({
    codigo: 1039,
    duenoId: camila.id,
    cuidadorId: diego.id,
    mascotaIds: [luna.id],
    fechaHora: enDias(-3, 10, 0),
    duracionMin: 30,
    pagoBs: 25,
    direccion: 'Av. América #1204',
    zona: 'Sarco',
    lat: -17.383,
    lng: -66.175,
    estado: EstadoServicio.finalizada,
    eventos: [
      { estado: EstadoServicio.publicada, haceMin: 4_500 },
      { estado: EstadoServicio.aceptada, haceMin: 4_466 },
      { estado: EstadoServicio.programada, haceMin: 4_420 },
      { estado: EstadoServicio.proceso, haceMin: 4_388 },
      { estado: EstadoServicio.finalizada, haceMin: 4_354 },
    ],
  });

  // ── #1038 · Cancelada ─────────────────────────────────────────────────────
  await crearSolicitud({
    codigo: 1038,
    duenoId: camila.id,
    mascotaIds: [luna.id],
    fechaHora: enDias(-6, 9, 0),
    duracionMin: 45,
    pagoBs: 30,
    direccion: 'Av. América #1204',
    zona: 'Sarco',
    lat: -17.383,
    lng: -66.175,
    estado: EstadoServicio.cancelada,
    eventos: [
      { estado: EstadoServicio.publicada, haceMin: 8_800 },
      { estado: EstadoServicio.cancelada, haceMin: 8_768 },
    ],
  });

  // ── Publicadas que ve el cuidador en el mapa ──────────────────────────────
  // Coordenadas reales del Cercado, tomadas del handoff.
  const publicadas: Parameters<typeof crearSolicitud>[0][] = [
    {
      codigo: 1045,
      duenoId: mariana.id,
      mascotaIds: [kira.id],
      fechaHora: enDias(1, 7, 30),
      duracionMin: 30,
      pagoBs: 25,
      direccion: 'Calle Ladislao Cabrera #78',
      zona: 'Queru Queru',
      lat: -17.376,
      lng: -66.149,
      notas: 'Kira es fuerte pero obediente.',
      estado: EstadoServicio.publicada,
      eventos: [{ estado: EstadoServicio.publicada, haceMin: 60 }],
    },
    {
      codigo: 1047,
      duenoId: javier.id,
      mascotaIds: [toby.id, nala.id],
      fechaHora: enDias(1, 17, 0),
      duracionMin: 90,
      pagoBs: 70,
      direccion: 'Av. América Este #2210',
      zona: 'Cala Cala',
      lat: -17.369,
      lng: -66.16,
      notas: 'Los dos son grandes; se llevan bien entre ellos.',
      estado: EstadoServicio.publicada,
      eventos: [{ estado: EstadoServicio.publicada, haceMin: 180 }],
    },
    {
      codigo: 1048,
      duenoId: mariana.id,
      mascotaIds: [bruno.id],
      fechaHora: enDias(2, 9, 0),
      duracionMin: 60,
      pagoBs: 40,
      direccion: 'Calle Muyurina #145',
      zona: 'Muyurina',
      lat: -17.382,
      lng: -66.14,
      estado: EstadoServicio.publicada,
      eventos: [{ estado: EstadoServicio.publicada, haceMin: 720 }],
    },
    {
      codigo: 1046,
      duenoId: javier.id,
      mascotaIds: [toby.id],
      fechaHora: enDias(0, 19, 0),
      duracionMin: 45,
      pagoBs: 30,
      direccion: 'Calle Bolívar #340',
      zona: 'Centro',
      lat: -17.3935,
      lng: -66.157,
      estado: EstadoServicio.publicada,
      eventos: [{ estado: EstadoServicio.publicada, haceMin: 120 }],
    },
  ];

  for (const datos of publicadas) await crearSolicitud(datos);

  console.log('Intereses…');

  // Tres cuidadores se ofrecieron a la #1040: es el caso que demuestra que el
  // dueño elige. Los mensajes son los del handoff, verbatim.
  await prisma.interes.createMany({
    data: [
      {
        solicitudId: s1040.id,
        cuidadorId: diego.id,
        mensaje:
          'Puedo pasar 10 minutos antes. Tengo experiencia con pastores alemanes y arnés propio.',
        metros: 600,
      },
      {
        solicitudId: s1040.id,
        cuidadorId: ana.id,
        mensaje: 'Estoy libre esa tarde y hago la ruta del parque Mariscal.',
        metros: 1_400,
      },
      {
        solicitudId: s1040.id,
        cuidadorId: luis.id,
        mensaje: 'Disponible toda la semana. Puedo llevar a las dos mascotas juntas.',
        metros: 2_100,
      },
    ],
  });

  console.log('Mensajes…');

  // La conversación de la #1042, tal como está en el handoff.
  const guion: { autorId: string; texto: string; haceMin: number }[] = [
    { autorId: diego.id, texto: 'Hola Camila, confirmo el paseo de hoy a las 17:30.', haceMin: 76 },
    { autorId: camila.id, texto: 'Gracias Diego. Rocco jala al inicio, mejor con arnés.', haceMin: 72 },
    { autorId: diego.id, texto: 'Entendido, llevo arnés de repuesto por si acaso.', haceMin: 70 },
    { autorId: camila.id, texto: 'Perfecto. El timbre es el 2B.', haceMin: 64 },
    { autorId: diego.id, texto: 'Ya salimos, todo tranquilo por la avenida.', haceMin: 39 },
  ];

  for (const m of guion) {
    await prisma.mensaje.create({
      data: {
        solicitudId: s1042.id,
        autorId: m.autorId,
        texto: m.texto,
        creadoEn: haceMinutos(m.haceMin),
        // Los de Camila los leyó Diego; el último de Diego sigue sin leer, para
        // que la bandeja muestre el contador de no leídos.
        leidoEn: m.autorId === camila.id ? haceMinutos(m.haceMin - 1) : null,
      },
    });
  }

  await prisma.mensaje.create({
    data: {
      solicitudId: s1041.id,
      autorId: ana.id,
      texto: 'Perfecto, mañana 08:00 en la puerta.',
      creadoEn: haceMinutos(1_450),
    },
  });

  console.log('Notificaciones…');

  await prisma.notificacion.createMany({
    data: [
      {
        usuarioId: camila.id,
        tipo: TipoNotificacion.interes,
        titulo: 'Diego Rojas está interesado en tu solicitud',
        cuerpo: 'Solicitud #1040 · Rocco · paseo del lunes a las 18:00.',
        solicitudId: s1040.id,
        leida: false,
        creadoEn: haceMinutos(5),
      },
      {
        // Ésta es la que cierra el servicio. Es el camino principal de la
        // confirmación del dueño.
        usuarioId: camila.id,
        tipo: TipoNotificacion.confirmar,
        titulo: 'Confirma que el paseo terminó',
        cuerpo:
          'Diego marcó como finalizado el paseo de Rocco y Luna. Confirma para cerrar el servicio.',
        solicitudId: s1042.id,
        leida: false,
        creadoEn: haceMinutos(12),
      },
      {
        usuarioId: camila.id,
        tipo: TipoNotificacion.iniciado,
        titulo: 'Diego marcó el paseo como iniciado',
        cuerpo: 'Solicitud #1042 · Rocco y Luna salieron a las 17:32.',
        solicitudId: s1042.id,
        leida: false,
        creadoEn: haceMinutos(40),
      },
      {
        usuarioId: camila.id,
        tipo: TipoNotificacion.aceptado,
        titulo: 'Ana Peredo aceptó el paseo de Momo',
        cuerpo: 'Solicitud #1041 · mañana a las 08:00 en Calle Bolívar #340.',
        solicitudId: s1041.id,
        leida: true,
        creadoEn: haceMinutos(1_456),
      },
      {
        usuarioId: diego.id,
        tipo: TipoNotificacion.aceptado,
        titulo: 'Te asignaron el paseo de Rocco y Luna',
        cuerpo: 'Solicitud #1042 · hoy a las 17:30 en Av. América #1204.',
        solicitudId: s1042.id,
        leida: true,
        creadoEn: haceMinutos(412),
      },
    ],
  });

  const solicitudes = await prisma.solicitud.count();
  const codigos = await prisma.solicitud.findMany({
    select: { codigo: true },
    orderBy: { codigo: 'asc' },
  });

  console.log(`
Listo.

  Usuarios      6
  Mascotas      7
  Solicitudes   ${solicitudes} · ${codigos.map((c) => `#${c.codigo}`).join(' ')}

  Contraseña de todas las cuentas: ${CLAVE}

    Dueña       camila.v@gmail.com
    Cuidador    diego.r@gmail.com
    Cuidadora   ana.p@gmail.com

  La #1042 (Rocco y Luna) quedó en 'proceso' con awaitingConfirmation activo.
  Entra como Camila, abre Notificaciones y pulsa "Confirmar": ése es el caso
  que demuestra la regla del cliente.
`);
}

sembrar()
  .catch((error) => {
    console.error('\nEl seed falló:\n', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
