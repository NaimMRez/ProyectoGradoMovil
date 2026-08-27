import { View } from 'react-native';
import type { Solicitud } from '../api/tipos';
import { borde, texto, verde } from '../theme/colors';
import { espacio, radio } from '../theme/layout';
import Card from './Card';
import Icono, { type NombreIcono } from './Icono';
import PhotoPlaceholder from './PhotoPlaceholder';
import StatusBadge from './StatusBadge';
import Texto from './Texto';

/** Icono + texto de metadato. Se repite en las tres variantes. */
export function Meta({
  icono,
  children,
  color = texto.secundario,
}: {
  icono?: NombreIcono;
  children: string;
  color?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xs + 1 }}>
      {icono ? <Icono nombre={icono} tamano={15} color={texto.terciario} /> : null}
      <Texto variante="meta" color={color}>
        {children}
      </Texto>
    </View>
  );
}

/** Franja inferior separada por una línea, común a las tres variantes. */
function Pie({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacio['3xl'],
        borderTopWidth: 1,
        borderTopColor: borde.divisor,
        marginTop: espacio.xxl,
        paddingTop: espacio.xl + 1,
      }}
    >
      {children}
    </View>
  );
}

export type VarianteTarjeta =
  /** Inicio del dueño: sin miniatura, la dirección manda. */
  | 'dueno'
  /** Lista de solicitudes o servicios: con miniatura y badge. */
  | 'lista'
  /** Feed del cuidador: el pago en tipografía de display y la distancia. */
  | 'cuidador';

export type TarjetaSolicitudProps = {
  solicitud: Solicitud;
  variante: VarianteTarjeta;
  onPress?: () => void;
  /**
   * `elevated` para la única tarjeta que manda en la pantalla. El resto de la
   * lista va en `raised`.
   */
  nivel?: 'flat' | 'raised' | 'elevated';
};

export function TarjetaSolicitud({
  solicitud,
  variante,
  onPress,
  nivel = 'raised',
}: TarjetaSolicitudProps) {
  const etiquetaAccesible = `Solicitud ${solicitud.codigo}, ${solicitud.mascotasEtiqueta}, ${solicitud.estadoEtiqueta}, ${solicitud.pagoEtiqueta}`;

  if (variante === 'dueno') {
    return (
      <Card
        nivel={nivel}
        onPress={onPress}
        accessibilityLabel={etiquetaAccesible}
        style={{ padding: espacio['3xl'] }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: espacio.lg }}>
          <Texto variante="nombre" color={texto.tarjeta} style={{ flex: 1 }} numberOfLines={1}>
            {solicitud.mascotasEtiqueta}
          </Texto>
          <StatusBadge estado={solicitud.estado} etiqueta={solicitud.estadoEtiqueta} />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio.sm,
            marginTop: espacio.lg,
          }}
        >
          <Icono nombre="place" tamano={16} color={texto.terciario} />
          <Texto variante="meta" color={texto.secundario} numberOfLines={1} style={{ flex: 1 }}>
            {solicitud.direccion}
          </Texto>
        </View>

        <Pie>
          <Meta>{solicitud.fechaEtiqueta}</Meta>
          <Meta>{solicitud.duracionEtiqueta}</Meta>
          <Texto variante="botonS" color={verde.texto} style={{ marginLeft: 'auto' }}>
            {solicitud.pagoEtiqueta}
          </Texto>
        </Pie>
      </Card>
    );
  }

  if (variante === 'lista') {
    return (
      <Card
        nivel={nivel}
        onPress={onPress}
        accessibilityLabel={etiquetaAccesible}
        style={{ padding: espacio['3xl'] }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xl }}>
          <PhotoPlaceholder
            fotoUrl={solicitud.fotoUrl}
            nombre={solicitud.mascotas[0]?.nombre}
            tamano={42}
            radioFoto={radio.md}
          />
          <View style={{ flex: 1 }}>
            <Texto variante="nombre" color={texto.tarjeta} numberOfLines={1}>
              {solicitud.mascotasEtiqueta}
            </Texto>
            <Texto variante="meta" color={texto.terciario} numberOfLines={1}>
              {solicitud.direccion}
            </Texto>
          </View>
          <StatusBadge estado={solicitud.estado} etiqueta={solicitud.estadoEtiqueta} />
        </View>

        <Pie>
          <Meta icono="event">{solicitud.fechaEtiqueta}</Meta>
          <Meta icono="schedule">{solicitud.duracionEtiqueta}</Meta>
          <Texto variante="botonS" color={verde.texto} style={{ marginLeft: 'auto' }}>
            {solicitud.pagoEtiqueta}
          </Texto>
        </Pie>
      </Card>
    );
  }

  // Variante cuidador.
  return (
    <Card
      nivel={nivel}
      onPress={onPress}
      accessibilityLabel={`${etiquetaAccesible}${solicitud.distanciaEtiqueta ? `, a ${solicitud.distanciaEtiqueta}` : ''}`}
      style={{ padding: 15 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xl }}>
        <PhotoPlaceholder
          fotoUrl={solicitud.fotoUrl}
          nombre={solicitud.mascotas[0]?.nombre}
          tamano={46}
          radioFoto={radio.lg}
        />

        <View style={{ flex: 1 }}>
          <Texto variante="nombre" color={texto.tarjeta} numberOfLines={1}>
            {solicitud.mascotasEtiqueta}
          </Texto>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xs }}>
            <Icono nombre="place" tamano={14} color={texto.terciario} />
            <Texto variante="meta" color={texto.terciario} numberOfLines={1}>
              {solicitud.zona}
            </Texto>
          </View>
        </View>

        {/* El pago va en tipografía de display y no en cuerpo: para el
            cuidador es el dato con el que decide si le compensa el viaje. */}
        <View style={{ alignItems: 'flex-end' }}>
          <Texto variante="cifra" color={verde.texto}>
            {solicitud.pagoEtiqueta}
          </Texto>
          {solicitud.distanciaEtiqueta ? (
            <Texto variante="caption" color={texto.tenue} style={{ fontFamily: 'DMSans_500Medium' }}>
              {solicitud.distanciaEtiqueta}
            </Texto>
          ) : null}
        </View>
      </View>

      <Pie>
        <Meta icono="event">{solicitud.fechaCortaEtiqueta}</Meta>
        <Meta icono="schedule">{solicitud.duracionEtiqueta}</Meta>
        <View style={{ marginLeft: 'auto' }}>
          <Meta icono="pets">{solicitud.mascotasConteoEtiqueta}</Meta>
        </View>
      </Pie>
    </Card>
  );
}

export default TarjetaSolicitud;
