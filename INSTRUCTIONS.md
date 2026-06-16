# Guía de Diseño y Funcionamiento: Sistema de Licencias por PC

Este documento describe la lógica de negocio, arquitectura y flujo de operaciones para implementar un sistema de licenciamiento y control de dispositivos para la aplicación. Este diseño está optimizado para distribuirse en instaladores personalizados por cliente, ofreciendo una versión de prueba (demo) de 2 días y validación de hardware por volumen de computadoras sin depender de un servidor backend tradicional.

---

## 1. Arquitectura de Tres Capas

El sistema se compone de tres elementos que interactúan entre sí:

1. **Supabase (Nube):** Actúa como el centro de monitoreo y control de licencias. Aquí resides la verdad absoluta del estado de los clientes (si pagaron, cuántas computadoras tienen permitidas y qué dispositivos están registrados).
2. **BDD Local (Servidor de Red del Cliente):** Actúa como una caché local de licencias compartida para todas las computadoras de la oficina del cliente.
3. **App Electron (PC del Cliente):** Se ejecuta en cada computadora individual, lee el identificador único del hardware, consulta a la base de datos local y, si es necesario, se conecta a Supabase para autorizarse.

---

## 2. Estructura de Datos en Supabase (Nube)

Para controlar el acceso, en la base de datos de Supabase se definen dos tablas conceptuales:

### A. Tabla de Clientes
Almacena la información de facturación y límites comerciales:
* **Identificador del Cliente:** Un código único que tú asignas manualmente al crear al cliente (por ejemplo, `SETH-CLI-102`).
* **Límite de Computadoras:** El número máximo de PCs que el cliente ha pagado y tiene permitido conectar  (por ejemplo, `2` PCs).
* **Estado (Demo / Activo ):** Un interruptor lógico. Si es Demo, el cliente está en periodo de prueba de 2 días. Si es Activo, el cliente ya pagó y tiene acceso permanente. 
* **Estado de Suspensión:** Un interruptor para bloquear por completo a un cliente (por ejemplo, por falta de pago) sin importar que tenga cupos libres.

### B. Tabla de Dispositivos (Licencias por PC)
Almacena el registro de las computadoras que han sido vinculadas a la licencia de ese cliente, usando la libreria **node-machine-id**:
* **Identificador de Hardware (UUID):** El código único generado por la placa base o procesador de la computadora del usuario.
* **Nombre de la PC:** Un nombre descriptivo asignado por el usuario o por el sistema (ej. *"Caja Principal"* o *"Laptop Oficina"*) para facilitar el soporte técnico.
* **Estado de Bloqueo:** Permite suspender una computadora específica (en caso de robo o despido de personal) sin afectar al resto de las PCs del negocio.
* **Fecha de Última Conexión:** Se actualiza automáticamente cada vez que la app inicia con internet, permitiéndote saber qué computadoras se usan realmente.

---

## 3. Flujo Lógico Paso a Paso

### Fase 1: Configuración Inicial y Compilación
Como cada uno de tus clientes requiere una versión altamente personalizada (colores, logotipos, módulos específicos), el flujo inicia de forma manual:
1. Creas al cliente en tu Supabase con su límite de computadoras y su estado inicial como demo (pago desactivado).
2. En el repositorio único de ese cliente, configuras su código de activación correspondiente en los archivos de configuración interna del programa.
3. Compilas el instalador `.exe` exclusivo de ese cliente y se lo entregas.

### Fase 2: El Periodo Demo (2 Días de Prueba)
Cuando el cliente instala y abre la app por primera vez:
1. La aplicación detecta que la base de datos local de la oficina está completamente vacía (no hay registros de licencias anteriores en la red).
2. La app lee el identificador físico de la computadora (UUID de hardware) mediante **node-machine-id**.
3. Realiza una petición por internet a Supabase para registrar la computadora en el modo de prueba.
4. **Respuesta de Supabase:**
   * Registra la PC con la fecha del primer arranque.
   * Calcula el tiempo restante de la demo. Si tiene menos de 2 días, autoriza el acceso.
   * Si han transcurrido más de 2 días y el cliente no ha pagado, bloquea el inicio y muestra la pantalla de expiración.
5. Si la demo está activa, la app guarda este UUID de hardware en la base de datos local de la oficina y permite al usuario trabajar.

### Fase 3: Activación y Conversión a Cliente Pagado
Cuando el cliente te realiza el pago:
1. **Tú actúas:** En la interfaz de Supabase, buscas al cliente y cambias su estado a pagado.
2. **Reinicio de la App:** La próxima vez que el cliente abre el programa en cualquiera de sus computadoras autorizadas, la app detecta el cambio en la nube de Supabase.
3. La aplicación se actualiza localmente y guarda permanentemente en su base de datos local que la licencia ha sido activada de por vida, pero cada 5 dias debera conectarse a internet para validar la licencia en SupaBase.

### Fase 4: Validación de Límites de PCs
Una vez que el cliente es permanente, el sistema protege el volumen de computadoras instaladas:
1. El usuario intenta abrir la app en una computadora nueva (PC 3).
2. Como esta PC 3 no está registrada en la bdd local de la oficina, la app se ve obligada a conectarse a internet para validar el registro con Supabase.
3. Supabase evalúa la solicitud:
   * Cuenta los dispositivos registrados para el cliente.
   * Si ya se alcanzó el límite contratado (ej. 2 de 2), Supabase **deniega** el registro.
   * La app en la PC 3 se bloquea inmediatamente mostrando un aviso de que ha sobrepasado los dispositivos autorizados.
   * Las PC 1 y PC 2 siguen trabajando normalmente.

### Fase 5: Operación Offline de Alta Confiabilidad
Una gran ventaja de este diseño es el manejo de caídas de internet:
* Cuando las PCs autorizadas (PC 1 y PC 2) inician, consultan la base de datos local de la oficina (centralizado en red local).
* Al ver que sus UUIDs físicos coinciden con los que están autorizados en la base de datos local, **inician de inmediato sin necesidad de conectarse a internet**.
* Esto asegura que, si la empresa pierde conexión a internet o los servidores de Supabase sufren una caída, el negocio del cliente nunca se detendrá y podrá seguir cobrando y operando su base de datos local sin interrupciones.

---

## 4. Gestión de Incidencias y Soporte Técnico

Tú controlas todo de forma remota y visual desde la interfaz web de Supabase para responder a las necesidades comunes de tus clientes:

* **¿El cliente compró una licencia para una PC extra?**
  * Simplemente subes el número en el campo de límite de PCs de ese cliente en Supabase. Al instante, la nueva PC podrá registrarse al abrir la app.
* **¿El cliente reemplazó una PC vieja o dañada?**
  * Eliminas la fila correspondiente a la PC dañada en Supabase (puedes identificarla por el nombre descriptivo que le dio el cliente, ej: *"Caja 1"*). Esto libera un cupo en su licencia. El cliente solo abre la app en su nueva computadora, y esta se registrará automáticamente en el cupo liberado.
* **¿Se robaron una computadora del negocio?**
  * Marcas el campo de bloqueo de esa PC específica como verdadero en Supabase. Si esa PC se conecta a internet e intenta iniciar la app, se bloqueará de inmediato y borrará las credenciales locales de acceso.
* **¿El cliente canceló o no pagó su suscripción?**
  * Desactivas el interruptor del cliente en Supabase. En su próximo inicio de día, todas sus computadoras se bloquearán de manera simultánea.

---

## 5. Mantenimiento y Actualizaciones de la Aplicación

Para asegurar que las actualizaciones no interfieran con las licencias activas:
* Las actualizaciones se distribuyen automáticamente en segundo plano a través de `electron-updater` utilizando archivos diferenciales (blockmaps).
* El proceso de actualización modifica únicamente los archivos ejecutables y de lógica de la aplicación.
* **Las bases de datos locales (donde está guardada la licencia local) nunca son reemplazadas ni eliminadas por el instalador**, garantizando que el cliente nunca pierda sus datos ni su activación al recibir una actualización de software.
