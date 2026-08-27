-- PetGo · migración inicial
--
-- Además de las tablas que genera Prisma desde el esquema, esta migración
-- añade a mano las tres cosas que Prisma no sabe expresar:
--
--   1. La extensión PostGIS.
--   2. El índice GiST sobre `requests.ubicacion`, que es lo que mantiene rápida
--      la consulta de solicitudes cercanas cuando la tabla crece.
--   3. Un trigger que rellena `ubicacion` a partir de `lat` y `lng`, para que
--      nadie tenga que acordarse de hacerlo — ni pueda escribirla mal.

-- ─────────────────────────────────────────────────────────────────────────────
-- PostGIS
-- ─────────────────────────────────────────────────────────────────────────────
-- Si esto falla con "permission denied to create extension", el rol de la base
-- necesita ser superusuario una sola vez, o hay que crear la extensión a mano:
--   psql -d petgo_db -c 'CREATE EXTENSION IF NOT EXISTS postgis;'
CREATE EXTENSION IF NOT EXISTS postgis;


-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('dueno', 'cuidador');

-- CreateEnum
CREATE TYPE "EstadoServicio" AS ENUM ('publicada', 'aceptada', 'programada', 'proceso', 'finalizada', 'cancelada');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('macho', 'hembra');

-- CreateEnum
CREATE TYPE "Tamano" AS ENUM ('pequeno', 'mediano', 'grande');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('interes', 'confirmar', 'iniciado', 'aceptado', 'cancelada');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "zona" TEXT NOT NULL DEFAULT 'Cercado, Cochabamba',
    "foto_url" TEXT,
    "paseos_completados" INTEGER,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "ubicacion" geography(Point, 4326),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "raza" TEXT NOT NULL DEFAULT 'Mestizo',
    "edad" TEXT NOT NULL DEFAULT '—',
    "sexo" "Sexo" NOT NULL DEFAULT 'macho',
    "tamano" "Tamano" NOT NULL DEFAULT 'mediano',
    "peso" TEXT NOT NULL DEFAULT '—',
    "notas" TEXT NOT NULL DEFAULT '',
    "foto_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "codigo" SERIAL NOT NULL,
    "owner_id" TEXT NOT NULL,
    "carer_id" TEXT,
    "fecha_hora" TIMESTAMP(3) NOT NULL,
    "duracion_min" INTEGER NOT NULL,
    "pago_bs" INTEGER NOT NULL,
    "direccion" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "ubicacion" geography(Point, 4326),
    "notas" TEXT NOT NULL DEFAULT '',
    "estado" "EstadoServicio" NOT NULL DEFAULT 'publicada',
    "awaiting_confirmation" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_pets" (
    "request_id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,

    CONSTRAINT "request_pets_pkey" PRIMARY KEY ("request_id","pet_id")
);

-- CreateTable
CREATE TABLE "request_status_events" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "estado" "EstadoServicio" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interests" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "carer_id" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL DEFAULT '',
    "metros" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "request_id" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_correo_key" ON "users"("correo");

-- CreateIndex
CREATE INDEX "pets_owner_id_idx" ON "pets"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "requests_codigo_key" ON "requests"("codigo");

-- CreateIndex
CREATE INDEX "requests_estado_idx" ON "requests"("estado");

-- CreateIndex
CREATE INDEX "requests_owner_id_idx" ON "requests"("owner_id");

-- CreateIndex
CREATE INDEX "requests_carer_id_idx" ON "requests"("carer_id");

-- CreateIndex
CREATE INDEX "request_pets_pet_id_idx" ON "request_pets"("pet_id");

-- CreateIndex
CREATE INDEX "request_status_events_request_id_idx" ON "request_status_events"("request_id");

-- CreateIndex
CREATE INDEX "interests_request_id_idx" ON "interests"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "interests_request_id_carer_id_key" ON "interests"("request_id", "carer_id");

-- CreateIndex
CREATE INDEX "messages_request_id_created_at_idx" ON "messages"("request_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_pets" ADD CONSTRAINT "request_pets_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_pets" ADD CONSTRAINT "request_pets_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_events" ADD CONSTRAINT "request_status_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- Sincronización de `ubicacion` desde lat/lng
-- ─────────────────────────────────────────────────────────────────────────────
-- Prisma no tiene tipo `geography`, así que `ubicacion` está declarada como
-- `Unsupported` y **nunca se escribe desde Prisma**. Este trigger la deriva de
-- las dos columnas que Prisma sí maneja.
--
-- Ojo con el orden de los argumentos: `ST_MakePoint` recibe
-- **(longitud, latitud)**, al revés de como se escriben las coordenadas en
-- lenguaje corriente. Invertirlos no da error — coloca el punto en otro
-- continente, y sólo se nota cuando la lista de solicitudes cercanas sale
-- vacía.
CREATE OR REPLACE FUNCTION petgo_sincronizar_ubicacion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
    NEW.ubicacion := NULL;
  ELSE
    NEW.ubicacion := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER requests_ubicacion_sync
  BEFORE INSERT OR UPDATE OF lat, lng ON "requests"
  FOR EACH ROW EXECUTE FUNCTION petgo_sincronizar_ubicacion();

CREATE TRIGGER users_ubicacion_sync
  BEFORE INSERT OR UPDATE OF lat, lng ON "users"
  FOR EACH ROW EXECUTE FUNCTION petgo_sincronizar_ubicacion();

-- ─────────────────────────────────────────────────────────────────────────────
-- Índice geoespacial
-- ─────────────────────────────────────────────────────────────────────────────
-- Es lo que hace que `ST_DWithin` no degrade a escaneo secuencial. Sin él la
-- consulta de "solicitudes cerca de mí" funciona igual con cien filas y se cae
-- con cien mil.
CREATE INDEX requests_ubicacion_gix ON "requests" USING GIST (ubicacion);
CREATE INDEX users_ubicacion_gix ON "users" USING GIST (ubicacion);

-- Índice compuesto para el camino caliente: sólo las publicadas y libres
-- entran en la búsqueda por radio.
CREATE INDEX requests_publicadas_idx
  ON "requests" (estado, carer_id)
  WHERE estado = 'publicada' AND carer_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Correlativo visible
-- ─────────────────────────────────────────────────────────────────────────────
-- Las solicitudes se muestran como "#1042". Arrancar la secuencia en 1038 hace
-- que los códigos del seed coincidan con los del handoff y con los de la
-- demostración.
ALTER SEQUENCE "requests_codigo_seq" RESTART WITH 1038;
