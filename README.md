# 🎥 Web de Reacciones de Video para Discord

---

### **💡 ¿Qué es?**

Esta es una aplicación web diseñada para **streamers, comunidades o grupos de amigos** que quieren compartir y reaccionar a videos de forma interactiva. Se conecta a un bot de Discord que gestiona los videos enviados en un canal específico, permitiendo a los usuarios verlos desde una interfaz simple y cómoda.

---

### **⚙️ Características Principales**

-   **Integración con Discord**: El bot gestiona los videos enviados en un canal de texto dedicado.
-   **Posibilidad de ban**: Elige entre banear al usuario en caso de que el video no cumpla con tus expectativas.
-   **Reproducción Sencilla**: Permite ver una cola de videos directamente desde la web.
-   **Interactividad**: Incluye funciones para navegar (`Siguiente`, `Anterior`) y marcar videos como "vistos" o "banear" a usuarios.
-   **Barra de Reacciones**: Muestra el porcentaje de likes/dislikes de la comunidad, reflejando la opinión general sobre un video.
-   **Controles de Teclado**: Soporte para atajos de teclado para una experiencia fluida (por ejemplo, `Enter` para banear, `Espacio` para pausa/play).

---

### **🛠️ Estructura del Proyecto**

* **`web` (Frontend)**: Interfaz desarrollada con **React** y **Vite**.
* **`bot` (Backend)**: Lógica del bot de Discord y la API REST, desarrollada con **Node.js** y **Express.js**.

La comunicación entre ambos se realiza a través de una API, usando un **proxy de Vite** en desarrollo para redirigir las peticiones del frontend al backend sin problemas.

---

### **🚀 Puesta en marcha**

1.  **Instala las dependencias**:
    ```bash
    npm install
    ```
2.  **Configura el bot**:
    * Ve a la carpeta `src/bot`.
    * Copia `.env.example` a `.env` y añade tu `DISCORD_TOKEN`.
3.  **Inicia la aplicación completa**:
    ```bash
    npm start
    ```
    Este comando inicia tanto el servidor de la web como el bot. Podrás acceder a la web en `http://localhost:5173`.
