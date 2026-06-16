# NeonMatch // Cyberpunk Memory Game — Reporte de Ingeniería y Defensa

Este documento detalla el análisis arquitectónico, las auditorías de seguridad y las decisiones de diseño implementadas para mitigar las deficiencias del código generado mediante Inteligencia Artificial en el desarrollo de la aplicación *NeonMatch*.

---

## 1. Auditoría de la IA: Fortalezas y Fallos Críticos

El uso de asistentes de IA en las fases iniciales del proyecto aceleró los flujos de trabajo tradicionales, pero introdujo vulnerabilidades graves y código propenso a fallos en producción.

### Dónde ayudó la IA:
* **Boilerplate y Estructura CSS:** Agilizó la escritura de variables nativas de CSS (`:root`), la declaración de degradados y la configuración matemática de las transiciones cúbicas de flexbox y CSS Grid.
* **Prototipado del algoritmo:** Facilitó la base del algoritmo de barajado Fisher-Yates, ahorrando tiempo en la lógica pura de aleatoriedad.

### Código de mala calidad o incorrecto entregado por la IA:
* **"Divitis" Crónica:** El código inicial abusaba de etiquetas `<div>` para elementos de interfaz interactivos (como las cartas) o salidas de datos. Se corrigió sustituyéndolos por `<button>` y `<output>` para cumplir con los estándares de accesibilidad semántica de la W3C.
* **Falta de Control de Flujo (Race Conditions):** El motor JS original permitía registrar clics en una tercera o cuarta carta mientras procesaba el retardo de un fallo (`setTimeout`), corrompiendo el array de volteadas.
* **Vulnerabilidad de Auto-Selección:** Al no verificar si un índice ya existía en la selección, un doble clic rápido a la misma carta provocaba que se comparara consigo misma en el DOM y se diera por válida de forma fraudulenta.

---

## 2. Justificación Técnica de Decisiones de Diseño

### A. Delegación de Eventos en el Tablero (`board-container`)
En lugar de inyectar de manera ineficiente un escuchador de eventos (`addEventListener`) por cada carta generada en el renderizado, se optó por implementar un **único punto de escucha** en el contenedor padre (`#game-board`) utilizando el método `.closest('.card')`.

* **Justificación:** Si el juego escala a una matriz experta (p. ej., 24 cartas), el navegador tendría que gestionar 24 listeners en memoria, destruyéndolos y recreándolos en cada reinicio de sesión. La delegación reduce el consumo de memoria a un solo nodo activo y previene fugas de memoria (*memory leaks*), garantizando un rendimiento óptimo de la CPU del cliente a largo plazo.

### B. Sanitización Estricta mediante `textContent` vs. `innerHTML`
Para la persistencia de datos (como el récord local) y la visualización de strings en el DOM, se prohibió el uso de `innerHTML` al acoplar variables dinámicas.

* **Justificación:** El uso de `innerHTML` abre vectores críticos de ataque para inyecciones **XSS (Cross-Site Scripting) basadas en el DOM**. Si el nombre de un usuario o un dato del sistema es alterado maliciosamente con un payload (ej. `<img src=x onerror=alert(document.cookie)>`), el navegador lo interpretaría como código ejecutable. Al forzar el uso de `textContent`, cualquier string inyectado es forzado a renderizarse estrictamente como texto plano, sanitizando la salida de datos de forma nativa.

---

## 3. Próximos Pasos e Incrementos Futuros

Con mayor tiempo de desarrollo, la principal mejora estructural sería la **migración a un flujo de renderizado basado en componentes reactivos con un patrón de Estado Inmutable**.

Actualmente, el archivo `script.js` interactúa de forma directa manipulando clases del DOM (`classList.replace`) en la mitad de la lógica de evaluación. Con más tiempo, se encapsularía la interfaz utilizando una arquitectura donde la vista sea un reflejo puro del estado (*View = f(State)*). Las mutaciones del tablero se procesarían primero en memoria mediante funciones puras y un despachador centralizado, notificando a un observador para actualizar el DOM en un solo ciclo de renderizado. Esto facilitaría la integración de pruebas unitarias automatizadas (Jest) para el motor del juego sin depender de un entorno gráfico de navegador (Headless testing).
