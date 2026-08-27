import { useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Button from './Button';
import Sheet from './Sheet';
import Texto from './Texto';
import { texto, verde } from '../theme/colors';
import { espacio } from '../theme/layout';

/**
 * Selector nativo de fecha y hora.
 *
 * Las dos plataformas lo resuelven de forma tan distinta que un único
 * componente declarativo no sirve:
 *
 * - **Android** abre dos diálogos del sistema encadenados, fecha y luego hora,
 *   con una API imperativa. No se renderiza nada.
 * - **iOS** monta una rueda que hay que meter en algún contenedor propio, con
 *   sus botones de confirmar y cancelar. Aquí va dentro del sheet de la app,
 *   para que se parezca al resto.
 *
 * Se expone una sola función, `abrir()`, y cada plataforma hace lo suyo por
 * dentro.
 */
export function useSelectorFechaHora(
  valor: Date,
  onElegir: (fecha: Date) => void,
) {
  // Sólo iOS necesita estado: en Android el diálogo es del sistema.
  const [abiertoIOS, setAbiertoIOS] = useState(false);
  const [borrador, setBorrador] = useState(valor);

  const abrir = () => {
    if (Platform.OS !== 'android') {
      setBorrador(valor);
      setAbiertoIOS(true);
      return;
    }

    DateTimePickerAndroid.open({
      value: valor,
      mode: 'date',
      // No tiene sentido agendar un paseo para ayer.
      minimumDate: new Date(),
      onChange: (evento: DateTimePickerEvent, fecha?: Date) => {
        if (evento.type !== 'set' || !fecha) return;

        // Encadenar la hora en el mismo gesto: pedirla en otro momento
        // obligaría al usuario a volver a entrar aquí.
        DateTimePickerAndroid.open({
          value: fecha,
          mode: 'time',
          is24Hour: true,
          onChange: (evHora: DateTimePickerEvent, hora?: Date) => {
            if (evHora.type !== 'set' || !hora) return;
            const combinada = new Date(fecha);
            combinada.setHours(hora.getHours(), hora.getMinutes(), 0, 0);
            onElegir(combinada);
          },
        });
      },
    });
  };

  const sheet =
    Platform.OS === 'android' ? null : (
      <Sheet abierto={abiertoIOS} onCerrar={() => setAbiertoIOS(false)}>
        <Texto
          variante="tituloSheet"
          color={texto.principal}
          style={{ marginBottom: espacio['4xl'] }}
        >
          Fecha y hora del paseo
        </Texto>

        <View style={{ alignItems: 'center' }}>
          <DateTimePicker
            value={borrador}
            mode="datetime"
            display="spinner"
            minimumDate={new Date()}
            accentColor={verde.primario}
            onChange={(_evento, fecha) => {
              if (fecha) setBorrador(fecha);
            }}
          />
        </View>

        <View style={{ gap: espacio.lg, marginTop: espacio['4xl'] }}>
          <Button
            titulo="Confirmar"
            completo
            haptico="ligero"
            onPress={() => {
              onElegir(borrador);
              setAbiertoIOS(false);
            }}
          />
          <Button
            titulo="Cancelar"
            variante="fantasma"
            completo
            onPress={() => setAbiertoIOS(false)}
          />
        </View>
      </Sheet>
    );

  return { abrir, sheet };
}

export default useSelectorFechaHora;
