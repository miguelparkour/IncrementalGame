# Desde cero

Prototipo de un incremental web: empiezas **sin dinero**, recoges latas con las manos, las vendes, compras un palo, añades una bolsa y consigues un carrito. Después puedes comprar un bate y obtener vagabundos para producir latas automáticamente.

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

1. Empieza con **$0** y tus manos: **1 lata por clic**, hasta **2 latas** en total.
2. **Vender todas las latas** vacía lo que llevas y suma **$0,10 por lata**. Al llenarse tu capacidad, necesitas vender para seguir recogiendo.
3. Tras vender diez latas (cinco viajes con las manos llenas), compra el **palo por $1** desde **Herramientas**. Permite llevar **5 latas**; sigue recogiendo 1 por clic.
4. Recoge y vende otras 50 latas para mejorar a **palo con bolsa por $5**: **20 latas** de capacidad y **2 por clic**.
5. Después del palo con bolsa puedes comprar un **carrito por $20**: amplía la capacidad a **100 latas** y mantiene la recogida en **2 por clic**. Ahorrar esos $20 requiere vender 200 latas (diez bolsas llenas).
6. El último clic recoge solo lo que cabe: con 19 de 20 latas o 99 de 100, recoge una. Las capacidades son totales por equipo, no se suman entre sí.
7. Consulta los logros completados en la pestaña **Logros**. La recogida y la venta siguen disponibles mientras cambias de pestaña.
8. Compra un **bate de béisbol por $40** en **Herramientas** para desbloquear **Vagabundos**. Es una compra independiente: solo requiere dinero y no altera la capacidad ni las latas por clic.
9. Cada vagabundo necesita **10 golpes con el bate**. Los primeros nueve no descuentan dinero; el décimo cuesta **$1**, añade un vagabundo y reinicia el contador. Si no tienes $1, conservas los nueve golpes hasta conseguirlo. Se pueden tener **10 vagabundos** como máximo.
10. Cada vagabundo genera **1 lata por segundo**: diez generan 10 latas/s. Comparten tu capacidad con las latas recogidas manualmente. La producción se detiene al llenarla; debes vender para que continúe.

Hasta obtener el primer vagabundo, no hay producción pasiva. Después hay producción tanto al esperar como al volver a abrir la partida, siempre limitada por la capacidad. La venta sigue siendo manual. El reinicio del pie de página requiere una confirmación y devuelve la partida a $0, sin equipo, latas, logros, vagabundos ni golpes acumulados.

Los seis logros iniciales reconocen la primera lata, llenar las manos, la primera venta, comprar el palo, añadir la bolsa y llenarla. Se desbloquean una sola vez, se guardan en orden de obtención y no dan bonificaciones económicas. La pestaña solo enumera los completados. El logro de llenar la bolsa también puede completarse después de comprar el carrito, ya que conservas el palo con bolsa.

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

- [`game/state.ts`](src/game/state.ts): estado serializable y partida inicial. Se guardan recursos, nivel de transporte, logros, posesión del bate, vagabundos, golpes y resto de producción; los valores derivados se calculan.
- [`game/config.ts`](src/game/config.ts): dinero inicial, precio de venta, capacidad y recogida de las manos, y catálogo ordenado de herramientas con costes, capacidades y latas por clic. El primer elemento es la herramienta inicial y el siguiente su mejora. Añadir otro nivel al final solo requiere una entrada nueva. Reordenar o eliminar niveles exige una migración de partidas.
- [`game/economy.ts`](src/game/economy.ts): fórmulas y condiciones para comprar, recoger y vender. `getCapacity` calcula el límite y `getCollectionAmount` lo que cabe en el siguiente clic. La UI consulta las mismas condiciones que utiliza el motor.
- [`game/vagabonds.ts`](src/game/vagabonds.ts): condiciones de compra del bate, reclutamiento y tasa de producción. Sus precios, golpes necesarios, máximo y tasa por vagabundo están en `GAME_CONFIG`.
- [`game/production.ts`](src/game/production.ts): producción por tiempo transcurrido, con resto exacto y límite de capacidad. No modifica el dinero ni vende latas.
- [`game/achievements.ts`](src/game/achievements.ts): catálogo con IDs estables, nombres, descripciones y condiciones puras. El motor comprueba nuevos logros después de cada acción efectiva y conserva los anteriores. Añade aquí nuevos logros; no hay contadores de historial hasta que una condición los necesite.
- [`game/engine.ts`](src/game/engine.ts): `applyCommand(state, command)` devuelve el nuevo estado sin mutar el anterior. Las acciones inválidas conservan el estado. Aquí está también `advanceGame(state, elapsedMs)`.
- [`store/game-store.ts`](src/store/game-store.ts): recibe almacenamiento y reloj por inyección, carga la partida, ejecuta las reglas y guarda cada acción efectiva. Se usa `zustand/vanilla`, por lo que el store puede utilizarse sin React.
- [`persistence/save.ts`](src/persistence/save.ts): entrada y salida de datos externos; `encodeSave` y `decodeSave` servirán también para exportar e importar archivos.
- [`ui/App.tsx`](src/ui/App.tsx): presentación, botones y confirmación del reinicio. No modifica recursos ni calcula producción.
- [`ui/ProgressPanel.tsx`](src/ui/ProgressPanel.tsx): pestañas Herramientas, Logros y Vagabundos (esta última solo tras comprar el bate), con navegación por teclado mediante flechas, Inicio y Fin. Cambiar de pestaña no cambia el estado del juego.
- [`ui/VagabondsPanel.tsx`](src/ui/VagabondsPanel.tsx): muestra la cantidad de vagabundos, producción y progreso de los golpes; envía comandos al motor.

No hay un framework de sistemas, un bus de eventos, jerarquías empresariales predefinidas ni abstracciones de prestige. Las funciones pequeñas y el estado explícito permiten refactorizar cuando una mecánica real lo requiera.

## Dinero y números grandes

El dinero se guarda en **céntimos enteros**: $1 equivale a `100`. Así se evita acumular errores de coma flotante en las ventas. Las cantidades y las operaciones que pueden desbordarse están en [`game/amount.ts`](src/game/amount.ts); la UI convierte el dinero a dólares exclusivamente para mostrarlo.

El prototipo usa `number` y rechaza operaciones que superarían `Number.MAX_SAFE_INTEGER`, en lugar de perder precisión silenciosamente. Las latas del inventario y el dinero siguen siendo enteros. La producción conserva un resto interno en milésimas de lata, que se convierte en una lata entera al llegar a 1000.

Cuando la economía lo necesite, se podrá introducir una librería de números grandes en el dominio. Habrá que adaptar `amount.ts`, comparaciones y fórmulas de `economy.ts`/`engine.ts`, el formateo y la serialización con una migración. El alias `Amount` señala esa frontera; no pretende que cambiar de representación sea automático.

## Tiempo y progreso offline

La simulación recibe **milisegundos enteros transcurridos**, nunca fotogramas o ticks. El store calcula el tiempo con un reloj inyectable y evita retroceder si cambia la hora del sistema. Al cargar, entrega a `advanceGame` el tiempo transcurrido desde `savedAt`; también avanza antes de las acciones y al cambiar la visibilidad de la página. Así, un vagabundo nuevo solo produce desde el momento en que se obtiene.

`advanceGame` aplica `vagabundos × latas/segundo × tiempo` y conserva el resto en `productionRemainder`. Dividir un intervalo en muchas actualizaciones no cambia los recursos producidos. Sin vagabundos, el tiempo no produce nada.

`main.tsx` solicita una actualización cada 250 ms mediante `setTimeout`; el temporizador no es la fuente de verdad de la producción. Al ocultar la página se deja de solicitar actualizaciones y al volver se procesa el tiempo pendiente. No se utiliza `setInterval`.

El cálculo limita el tiempo al necesario para llenar el inventario antes de multiplicar, evitando desbordamientos durante ausencias largas. El tiempo sobrante con la capacidad llena se descarta; no se acumula para producir después de vender. Llenar el inventario manualmente también borra el resto de producción. Vender antes de llenarlo conserva el trabajo fraccional ya realizado. Si más adelante hay productores que generan otros productores, habrá que ampliar la integración temporal y sus pruebas.

## Guardado

Se utiliza `localStorage`, clave **`desde-cero.save`**. La partida actual es muy pequeña y se guarda después de cada acción o avance que cambia el estado, incluido el resto de producción. Con producción activa puede guardarse unas cuatro veces por segundo; con el inventario lleno no hay escrituras repetidas. Para esta fase no hace falta IndexedDB.

```json
{
  "version": 3,
  "savedAt": 1800000000000,
  "game": {
    "money": 0, "cans": 0, "toolLevel": 0, "achievements": [],
    "batOwned": false, "vagabonds": 0, "recruitHits": 0, "productionRemainder": 0
  }
}
```

- Se valida JSON, versión, fecha, cantidades enteras seguras, niveles de transporte y logros conocidos sin duplicados. También se comprueban los límites de vagabundos/golpes/resto y que no existan vagabundos o golpes sin bate.
- Un save dañado o de versión desconocida **se conserva sin sobrescribirlo**. La UI avisa de que el progreso provisional no se guardará hasta reiniciar.
- Si el almacenamiento no está disponible o falla una escritura, el juego sigue en memoria y muestra el error. La siguiente acción efectiva vuelve a intentar guardar.
- Reiniciar elimina exclusivamente esta clave y escribe una partida nueva. No se usa `localStorage.clear()`.
- `decodeSave` migra partidas v1 y v2 al formato v3 conservando dinero, latas y transporte. En v1 el gancho reforzado pasa a ser palo con bolsa y se reconocen los logros demostrables; los logros de v2 se conservan. Ninguna migración inventa ventas anteriores.
- Se añaden `batOwned: false`, `vagabonds: 0`, `recruitHits: 0` y `productionRemainder: 0` a las partidas antiguas. No hace falta reiniciarlas ni reciben producción retroactiva.
- Si una partida antigua tenía más latas que la capacidad, se conservan y se bloquea la recogida hasta venderlas o ampliar capacidad. Las versiones posteriores desconocidas siguen protegidas.
- Exportación/importación aún no tiene interfaz: reutilizará el códec, con validación y confirmación antes de reemplazar una partida.
- El guardado pertenece al origen del navegador; cambiar host o puerto, borrar datos del sitio o salir de una sesión privada puede hacer que no esté disponible. Por ahora está pensado para **una pestaña activa**: no hay coordinación de escrituras entre pestañas.

Si el save crece mucho, el adaptador podrá pasar a IndexedDB y el store deberá esperar sus operaciones asíncronas. No afectará a las reglas del juego.

## Dependencias

En ejecución: **React + React DOM** para la UI y **Zustand** para un store pequeño, observable e independiente de React. No se instala Phaser, un router, una biblioteca de componentes ni una biblioteca de números enormes.

En desarrollo: **Vite + su plugin de React**, **TypeScript + tipos**, **Vitest** y **ESLint + reglas de TypeScript, hooks y Fast Refresh**. TypeScript, typescript-eslint y los tipos de Node se fijan a versiones compatibles con el Node 22.12 instalado; ESLint usa la rama 9 por esa misma compatibilidad.

Referencias consultadas: [requisitos de Vite](https://vite.dev/guide/), [store vanilla de Zustand](https://zustand.docs.pmnd.rs/reference/apis/create-store) y [Vitest](https://vitest.dev/guide/).

## Tests y ampliaciones

Los tests cubren compras, recogida, capacidades y venta; bate y reclutamiento (10 golpes, $1 al completar, máximo 10); logros; producción temporal con fracciones, independencia de la frecuencia y pausa al llenarse; progreso offline sin duplicados; migraciones v1/v2 → v3; errores de almacenamiento; autosave, recarga y reinicio completo. El almacenamiento y el reloj se sustituyen por implementaciones pequeñas en memoria.

Siguientes pasos razonables:

1. Ajustar la duración del inicio y añadir progresión individual: rutas o clasificación. Sus datos y reglas irían en `game/`, añadiendo al estado solo lo que necesite persistir y adaptando el save cuando cambie su forma.
2. Añadir exportación/importación de partidas o logros de acumulación cuando se introduzcan estadísticas históricas.
3. Equilibrar la primera automatización y ampliar almacenamiento, organización o venta automática cuando corresponda.
4. Probar después sistemas de encargados, hitos, automatización o resets como módulos del dominio. No se fija todavía un equivalente a las Dimensions.

Una futura escena de Phaser podrá suscribirse al mismo store con `store.subscribe(...)` y enviar comandos mediante `store.getState().dispatch(...)`. React y Phaser representarían el mismo estado; ninguno sería dueño de la economía ni del reloj de simulación.
