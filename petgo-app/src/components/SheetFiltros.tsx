import { useState } from 'react';
import { View } from 'react-native';
import Button from './Button';
import { GrupoChips } from './Chip';
import PressableScale from './PressableScale';
import Sheet from './Sheet';
import Texto from './Texto';
import { FILTROS_POR_DEFECTO, OPCIONES_FILTRO, type Filtros } from '../api/tipos';
import { texto, verde } from '../theme/colors';
import { espacio } from '../theme/layout';

const GRUPOS: { clave: keyof Filtros; etiqueta: string; opciones: readonly string[] }[] = [
  { clave: 'distancia', etiqueta: 'Distancia máxima', opciones: OPCIONES_FILTRO.distancia },
  { clave: 'pago', etiqueta: 'Remuneración mínima', opciones: OPCIONES_FILTRO.pago },
  { clave: 'duracion', etiqueta: 'Duración', opciones: OPCIONES_FILTRO.duracion },
  { clave: 'fecha', etiqueta: 'Fecha', opciones: OPCIONES_FILTRO.fecha },
  { clave: 'mascotas', etiqueta: 'Cantidad de mascotas', opciones: OPCIONES_FILTRO.mascotas },
];

/**
 * Sheet de filtros del cuidador.
 *
 * Los cinco chips **viajan al backend**, no se aplican en el cliente: `"5 km"`
 * se traduce a 5000 metros para el `ST_DWithin`, `"Bs 40+"` a un mínimo de 40 y
 * `"Esta semana"` a un rango de fechas. Filtrar en el cliente obligaría a
 * traerse todas las solicitudes del Cercado para descartar la mayoría, que es
 * exactamente lo que el índice GiST está ahí para evitar.
 *
 * El borrador es local: sólo al pulsar "Ver N solicitudes" se aplican. Cambiar
 * un chip y ver la lista recalcularse debajo del sheet sería una consulta
 * geoespacial por toque.
 */
export function SheetFiltros({
  abierto,
  filtros,
  cuantas,
  onCerrar,
  onAplicar,
}: {
  abierto: boolean;
  filtros: Filtros;
  /** Cuántas solicitudes hay ahora mismo, para el texto del botón. */
  cuantas: number;
  onCerrar: () => void;
  onAplicar: (filtros: Filtros) => void;
}) {
  const [borrador, setBorrador] = useState<Filtros>(filtros);

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: espacio['5xl'],
        }}
      >
        <Texto variante="tituloSheet" color={texto.principal}>
          Filtros
        </Texto>
        <PressableScale
          onPress={() => setBorrador(FILTROS_POR_DEFECTO)}
          fuerza="fuerte"
          hitSlop={12}
        >
          <Texto variante="enlace" color={verde.enlace}>
            Limpiar
          </Texto>
        </PressableScale>
      </View>

      <View style={{ gap: espacio['4xl'] }}>
        {GRUPOS.map((grupo) => (
          <View key={grupo.clave}>
            <Texto
              variante="etiqueta"
              color={texto.etiqueta}
              style={{ marginBottom: espacio.lg }}
            >
              {grupo.etiqueta}
            </Texto>
            <GrupoChips
              opciones={grupo.opciones}
              valor={borrador[grupo.clave]}
              onCambio={(valor) => setBorrador((previo) => ({ ...previo, [grupo.clave]: valor }))}
            />
          </View>
        ))}
      </View>

      <Button
        titulo={`Ver ${cuantas === 1 ? '1 solicitud' : `${cuantas} solicitudes`}`}
        completo
        haptico="ligero"
        onPress={() => onAplicar(borrador)}
        style={{ marginTop: espacio['6xl'] }}
      />
    </Sheet>
  );
}

export default SheetFiltros;
