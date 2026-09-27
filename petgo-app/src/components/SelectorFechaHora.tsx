import { useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import Button from './Button';
import Icono from './Icono';
import PressableScale from './PressableScale';
import Sheet from './Sheet';
import Texto from './Texto';
import { DIAS_CORTOS, hora as formatoHora } from '../api/mock/formato';
import { borde, intencion, superficie, texto, verde } from '../theme/colors';
import { espacio, golpeo, radio } from '../theme/layout';
import {
  combinar,
  diasElegibles,
  inicioDeDia,
  mismoDia,
  proximaMediaHora,
} from '../utiles/agenda';

/** Meses en español. Sólo se rotula el del día elegido. */
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** Lado del punto que marca el día de hoy debajo de su número. */
const PUNTO = 5;

/** Una columna de la tira: abreviatura del día arriba, número debajo. */
function Dia({
  fecha,
  seleccionado,
  esHoy,
  onPress,
}: {
  fecha: Date;
  seleccionado: boolean;
  esHoy: boolean;
  onPress: () => void;
}) {
  const tinta = seleccionado ? texto.sobreAccion : texto.principal;

  return (
    <PressableScale
      fuerza="fuerte"
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionado }}
      accessibilityLabel={`${DIAS_CORTOS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}${esHoy ? ', hoy' : ''}`}
      onPress={onPress}
      // `flex` y no un ancho fijo: siete columnas de 44 pt más sus
      // separaciones no caben en una pantalla de 360, y con `flex` la tira se
      // reparte el ancho que haya sin desbordar en ninguna.
      style={{ flex: 1 }}
    >
      <View
        style={{
          alignItems: 'center',
          gap: espacio.xs,
          paddingVertical: espacio.lg,
          borderRadius: radio.xl,
          minHeight: golpeo.minHeight,
          // El día elegido es lo único pintado. Las otras seis columnas van
          // sin relleno ni borde a propósito: siete cajas en fila se leen como
          // una rejilla, no como una tira de días.
          backgroundColor: seleccionado ? verde.primario : 'transparent',
        }}
      >
        <Texto variante="caption" color={seleccionado ? tinta : texto.terciario}>
          {DIAS_CORTOS[fecha.getDay()]}
        </Texto>

        <Texto variante="cifra" color={tinta}>
          {fecha.getDate()}
        </Texto>

        {/* El punto marca hoy. Cuando no toca, ocupa su sitio en
            transparente para que los números de la fila queden alineados. */}
        <View
          style={{
            width: PUNTO,
            height: PUNTO,
            borderRadius: radio.pastilla,
            backgroundColor: esHoy ? tinta : 'transparent',
          }}
        />
      </View>
    </PressableScale>
  );
}

/**
 * Selector de fecha y hora del paseo.
 *
 * La fecha **no** usa el calendario nativo. Con un horizonte de una semana el
 * calendario es todo lo que no hace falta: doce meses de rejilla para siete
 * días elegibles, y el usuario tiene que localizarlos entre los atenuados. Una
 * tira horizontal de siete columnas los enseña todos a la vez y cada uno está
 * a un toque.
 *
 * Tampoco lleva las flechas de mes de un calendario: dentro de una ventana de
 * siete días no hay ningún mes al que ir. El rótulo del mes sigue al día
 * elegido, que es la única información que darían esas flechas.
 *
 * La hora sí es nativa, y ahí las dos plataformas obligan a separarse:
 *
 * - **iOS** monta la rueda en línea, dentro del sheet. Va en `spinner` y no en
 *   `compact` porque el desplegable de `compact` lo dibuja UIKit por encima
 *   del campo y dentro de un sheet propio, con `overflow` recortado, no hay
 *   garantía de que quepa.
 * - **Android** sólo sabe abrir el reloj como diálogo del sistema, así que en
 *   su lugar va un campo que lo lanza y muestra lo elegido.
 *
 * Antes las dos cosas iban juntas — `mode="datetime"` en iOS, dos diálogos
 * encadenados en Android — y Android no llegaba a ver el sheet. Ahora la
 * pantalla es la misma en las dos y sólo cambia el trozo de la hora.
 *
 * La validación de que el instante no quede en el pasado es nuestra. El
 * selector nativo la hacía con `minimumDate` sobre una fecha completa; al
 * separar el día de la hora ya no sirve, porque el mínimo de la hora depende
 * del día elegido. Se comprueba al confirmar y se explica en el sitio.
 */
export function useSelectorFechaHora(
  valor: Date | null,
  onElegir: (fecha: Date) => void,
) {
  const [abierto, setAbierto] = useState(false);

  // El día se guarda a medianoche y la hora aparte. Mantenerlos separados es
  // lo que permite cambiar de día sin perder la hora ya elegida.
  const [dia, setDia] = useState(() => inicioDeDia(valor ?? new Date()));
  const [momento, setMomento] = useState(() => valor ?? proximaMediaHora());

  // Se recalculan al abrir, no una sola vez: el sheet puede abrirse horas
  // después de montar la pantalla y la lista de días habría caducado.
  const [dias, setDias] = useState(diasElegibles);

  const elegido = combinar(dia, momento);
  const enElPasado = elegido.getTime() < Date.now();

  const abrir = () => {
    setDias(diasElegibles());

    if (valor) {
      setDia(inicioDeDia(valor));
      setMomento(valor);
    } else {
      // El día de arranque sale del mismo instante que la hora, no de `new
      // Date()`: a las 23:45 la próxima media hora ya es de mañana, y con dos
      // orígenes distintos el sheet se abriría en hoy a las 00:00.
      const arranque = proximaMediaHora();
      setDia(inicioDeDia(arranque));
      setMomento(arranque);
    }

    setAbierto(true);
  };

  const confirmar = () => {
    if (enElPasado) return;
    onElegir(elegido);
    setAbierto(false);
  };

  const sheet = (
    <Sheet abierto={abierto} onCerrar={() => setAbierto(false)}>
      <Texto
        variante="tituloSheet"
        color={texto.principal}
        style={{ marginBottom: espacio['4xl'] }}
      >
        Fecha y hora del paseo
      </Texto>

      {/* ── Día ───────────────────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: espacio.lg,
        }}
      >
        <Texto variante="tituloDenso" color={texto.fuerte}>
          Elegir día
        </Texto>
        <Texto variante="meta" color={texto.terciario}>
          {MESES[dia.getMonth()]}
        </Texto>
      </View>

      <View style={{ flexDirection: 'row', gap: espacio.xxs }}>
        {dias.map((d) => (
          <Dia
            key={d.getTime()}
            fecha={d}
            seleccionado={mismoDia(d, dia)}
            esHoy={mismoDia(d, dias[0])}
            onPress={() => setDia(d)}
          />
        ))}
      </View>

      {/* ── Hora ──────────────────────────────────────────────────────────── */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: borde.divisor,
          marginTop: espacio['4xl'],
          paddingTop: espacio['4xl'],
        }}
      >
        <Texto
          variante="tituloDenso"
          color={texto.fuerte}
          style={{ marginBottom: espacio.lg }}
        >
          Elegir hora
        </Texto>

        {Platform.OS === 'android' ? (
          <PressableScale
            fuerza="suave"
            accessibilityRole="button"
            accessibilityLabel={`Hora del paseo, ${formatoHora(elegido)}`}
            onPress={() =>
              DateTimePickerAndroid.open({
                value: elegido,
                mode: 'time',
                is24Hour: true,
                onChange: (evento: DateTimePickerEvent, hora?: Date) => {
                  if (evento.type !== 'set' || !hora) return;
                  setMomento(hora);
                },
              })
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: espacio.xl,
              paddingHorizontal: espacio['4xl'],
              paddingVertical: espacio.xxl,
              borderRadius: radio.lg,
              borderWidth: 1,
              borderColor: borde.input,
              backgroundColor: superficie.tarjeta,
            }}
          >
            <Icono nombre="schedule" tamano={20} color={verde.primario} />
            <Texto variante="cuerpo" color={texto.principal} style={{ flex: 1 }}>
              {formatoHora(elegido)}
            </Texto>
            <Icono nombre="chevron_right" tamano={18} color={texto.inactivo} />
          </PressableScale>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <DateTimePicker
              value={momento}
              mode="time"
              display="spinner"
              // Sin `minimumDate`: aquí acotaría la hora en todos los días y
              // no sólo en hoy. El límite real lo comprueba `enElPasado`.
              accentColor={verde.primario}
              onChange={(_evento, hora) => {
                if (hora) setMomento(hora);
              }}
            />
          </View>
        )}

        {enElPasado ? (
          <Texto
            variante="meta"
            color={intencion.destructivoTexto}
            style={{ marginTop: espacio.lg }}
          >
            Esa hora ya pasó. Elige una más tarde o pasa al día siguiente.
          </Texto>
        ) : null}
      </View>

      <View style={{ gap: espacio.lg, marginTop: espacio['4xl'] }}>
        <Button
          titulo="Confirmar"
          completo
          haptico="ligero"
          disabled={enElPasado}
          onPress={confirmar}
        />
        <Button
          titulo="Cancelar"
          variante="fantasma"
          completo
          onPress={() => setAbierto(false)}
        />
      </View>
    </Sheet>
  );

  return { abrir, sheet };
}

export default useSelectorFechaHora;
