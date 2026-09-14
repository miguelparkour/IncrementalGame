# Desde cero

Prototipo de un incremental web: empiezas con **1 dólar**, compras un palo con gancho, recoges latas, las vendes y mejoras tu herramienta. La primera etapa es completamente manual.

## Ejecutar

Requiere Node **22.12+ de la rama 22**, **24** o **26+**, y npm. Las versiones del proyecto están fijadas en `package-lock.json`.

```sh
npm ci
npm run dev
```

Abre la dirección que indique Vite, normalmente `http://localhost:5173`. En PowerShell, si la política de ejecución bloquea `npm.ps1`, usa `npm.cmd` en lugar de `npm`; no hace falta cambiar la política del equipo.

```sh
npm test            # Vitest, una ejecución
npm run test:watch  # Vitest, modo interactivo
npm run lint       # ESLint, sin warnings
npm run typecheck  # TypeScript estricto
npm run build      # Typecheck + compilación de producción en dist/
npm run preview    # Servir el build localmente
npm run check      # Tests + lint + typecheck + build
```

## Cómo jugar

1. Compra el **palo con gancho por $1**. Antes de comprarlo no puedes recoger latas.
2. Cada clic recoge **1 lata**, que queda almacenada hasta que la vendas.
3. **Vender todas las latas** vacía el inventario y suma **$0,10 por lata**.
4. Recoge y vende 50 latas para comprar el **gancho reforzado por $5**. A partir de entonces recoges **2 latas por clic**.
5. Puedes continuar recogiendo y vendiendo. Estas son todas las mejoras de esta versión.

No hay empleados, automatizaciones ni ganancias por esperar o cerrar el navegador. El reinicio del pie de página requiere una confirmación dentro de la interfaz y devuelve la partida a $1, sin herramienta ni latas.

## Arquitectura

```text
src/
  game/          Estado, configuración, cantidades, economía y transiciones puras
  persistence/   Formato JSON versionado, validación y acceso al almacenamiento
  store/         Store vanilla de Zustand: acciones, reloj y guardado
  ui/            Componentes React, formato de números y CSS
  test/          Almacenamiento en memoria para pruebas
  main.tsx       Conexión con navegador y montaje de React
```

La dirección de las dependencias es `UI → store → game/persistence`; `persistence` conoce el estado del dominio. **`game/` no importa React, Zustand, el DOM ni el reloj del sistema.** Las pruebas de las reglas se ejecutan en Node, sin navegador.

- [`game/state.ts`](src/game/state.ts): estado serializable y partida inicial. Solo se guardan recursos y nivel de herramienta; los valores derivados se calculan.
- [`game/config.ts`](src/game/config.ts): dinero inicial, precio de venta y catálogo ordenado de herramientas, con costes y latas por clic. El primer elemento es la herramienta inicial y el siguiente su mejora. Añadir otro nivel al final solo requiere una entrada nueva. Reordenar o eliminar niveles exige una migración de partidas.
- [`game/economy.ts`](src/game/economy.ts): fórmulas y condiciones para comprar, recoger y vender. La UI consulta las mismas condiciones que utiliza el motor.
- [`game/engine.ts`](src/game/engine.ts): `applyCommand(state, command)` devuelve el nuevo estado sin mutar el anterior. Las acciones inválidas conservan el estado. Aquí está también `advanceGame(state, elapsedMs)`.
- [`store/game-store.ts`](src/store/game-store.ts): recibe almacenamiento y reloj por inyección, carga la partida, ejecuta las reglas y guarda cada acción efectiva. Se usa `zustand/vanilla`, por lo que el store puede utilizarse sin React.
- [`persistence/save.ts`](src/persistence/save.ts): entrada y salida de datos externos; `encodeSave` y `decodeSave` servirán también para exportar e importar archivos.
- [`ui/App.tsx`](src/ui/App.tsx): presentación, botones y confirmación del reinicio. No modifica recursos ni calcula producción.

No hay un framework de sistemas, un bus de eventos, jerarquías empresariales predefinidas ni abstracciones de prestige. Las funciones pequeñas y el estado explícito permiten refactorizar cuando una mecánica real lo requiera.

## Dinero y números grandes

El dinero se guarda en **céntimos enteros**: $1 equivale a `100`. Así se evita acumular errores de coma flotante en las ventas. Las cantidades y las operaciones que pueden desbordarse están en [`game/amount.ts`](src/game/amount.ts); la UI convierte el dinero a dólares exclusivamente para mostrarlo.

La primera versión usa `number` y rechaza operaciones que superarían `Number.MAX_SAFE_INTEGER`, en lugar de perder precisión silenciosamente. Aún no admite cantidades mayores ni fracciones de lata/céntimo.

Cuando la economía lo necesite, se podrá introducir una librería de números grandes en el dominio. Habrá que adaptar `amount.ts`, comparaciones y fórmulas de `economy.ts`/`engine.ts`, el formateo y la serialización con una migración. El alias `Amount` señala esa frontera; no pretende que cambiar de representación sea automático.

## Tiempo y progreso offline

La simulación recibe **milisegundos transcurridos**, nunca fotogramas o ticks. El store calcula el tiempo con un reloj inyectable y evita retroceder si cambia la hora del sistema. Al cargar, entrega a `advanceGame` el tiempo transcurrido desde `savedAt`; también avanza antes de las acciones y al cambiar la visibilidad de la página.

`advanceGame` es deliberadamente una operación sin efecto en esta versión: el trabajo manual no genera recursos por esperar. No se necesita un bucle permanente ni `setInterval`.

Cuando aparezca producción automática, se añadirá allí el cálculo `tasa × tiempo`. Un planificador podrá llamar a `store.getState().advance()` para refrescar la simulación; su frecuencia no definirá cuánto se produce. Si hay productores que generan otros productores, habrá que elegir integración analítica o pasos internos de simulación y probar que dividir un intervalo conserva el resultado, incluido el resto fraccional. También se decidirán entonces los límites de progreso offline.

## Guardado

Se utiliza `localStorage`, clave **`desde-cero.save`**. La partida actual es muy pequeña y las escrituras síncronas después de cada acción efectiva simplifican el guardado inmediato, incluso si se cierra la pestaña. Para esta fase no hace falta IndexedDB.

```json
{
  "version": 1,
  "savedAt": 1800000000000,
  "game": { "money": 100, "cans": 0, "toolLevel": 0 }
}
```

- Se valida JSON, versión, fecha, campos obligatorios, cantidades enteras seguras y niveles de herramienta.
- Un save dañado o de versión desconocida **se conserva sin sobrescribirlo**. La UI avisa de que el progreso provisional no se guardará hasta reiniciar.
- Si el almacenamiento no está disponible o falla una escritura, el juego sigue en memoria y muestra el error. La siguiente acción efectiva vuelve a intentar guardar.
- Reiniciar elimina exclusivamente esta clave y escribe una partida nueva. No se usa `localStorage.clear()`.
- El punto de entrada de futuras migraciones está en `decodeSave`, antes de validar el estado de la versión actual. No se inventan migraciones para formatos que aún no existen.
- Exportación/importación aún no tiene interfaz: reutilizará el códec, con validación y confirmación antes de reemplazar una partida.
- El guardado pertenece al origen del navegador; cambiar host o puerto, borrar datos del sitio o salir de una sesión privada puede hacer que no esté disponible. Por ahora está pensado para **una pestaña activa**: no hay coordinación de escrituras entre pestañas.

Si el save crece mucho, el adaptador podrá pasar a IndexedDB y el store deberá esperar sus operaciones asíncronas. No afectará a las reglas del juego.

## Dependencias

En ejecución: **React + React DOM** para la UI y **Zustand** para un store pequeño, observable e independiente de React. No se instala Phaser, un router, una biblioteca de componentes ni una biblioteca de números enormes.

En desarrollo: **Vite + su plugin de React**, **TypeScript + tipos**, **Vitest** y **ESLint + reglas de TypeScript, hooks y Fast Refresh**. TypeScript, typescript-eslint y los tipos de Node se fijan a versiones compatibles con el Node 22.12 instalado; ESLint usa la rama 9 por esa misma compatibilidad.

Referencias consultadas: [requisitos de Vite](https://vite.dev/guide/), [store vanilla de Zustand](https://zustand.docs.pmnd.rs/reference/apis/create-store) y [Vitest](https://vitest.dev/guide/).

## Tests y ampliaciones

Los tests cubren compras con dinero exacto, sobrante o insuficiente; recogida con y sin herramienta; venta y redondeo; mejora; límites numéricos; ausencia de ingresos pasivos; códec y validación; errores de almacenamiento; autosave, recarga y reinicio persistente. El almacenamiento y el reloj se sustituyen por implementaciones pequeñas en memoria.

Siguientes pasos razonables:

1. Ajustar la duración del inicio y añadir progresión individual: bolsa, carrito, rutas o clasificación. Sus datos y reglas irían en `game/`, añadiendo al estado solo lo que necesite persistir y adaptando el save cuando cambie su forma.
2. Añadir exportación/importación de partidas y la primera migración cuando exista una segunda versión del formato.
3. Introducir al primer trabajador después de varias mejoras individuales y desarrollar la primera producción temporal con pruebas online/offline.
4. Probar después sistemas de encargados, hitos, automatización o resets como módulos del dominio. No se fija todavía un equivalente a las Dimensions.

Una futura escena de Phaser podrá suscribirse al mismo store con `store.subscribe(...)` y enviar comandos mediante `store.getState().dispatch(...)`. React y Phaser representarían el mismo estado; ninguno sería dueño de la economía ni del reloj de simulación.
