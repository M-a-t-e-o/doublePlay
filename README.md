# doublePlay app

## CHECKLIST
- [x] El diseño del front-end se adapta a lo planteado en el prototipo.
- [x] La aplicación es totalmente responsive. Si algún componente no se visualiza adecuadamente en la versión móvil, se ha eliminado. En la versión de escritorio, los componentes no quedan desproporcionados con respecto al viewport.
- [x] Se ha utilizado un framework de diseño y desarrollo de front-end como Bootstrap o Material, por ejemplo.
- [ ] No hay errores en el renderizado de las páginas. Esto podéis comprobarlo navegando con la consola del inspector del navegador abierta. 
- [x] Se utilizan modales en lugar de alerts o popups.
- [x] Si se ha utilizado una plantilla/template en alguna parte del front-end, se referencia correctamente en el código y en la documentación.
- [x] En el desarrollo se utilizan los elementos de programación propios del lenguaje escogido (por ejemplo, servicios, componentes, etc.).
- [x] Se ha definido un routing correcto en la aplicación.
- [x] Todas las vistas tienen botones/enlaces para poder volver al punto/a la vista anterior.
- [ ] Todo el código está correctamente documentado. Como mínimo, todos los ficheros tienen una cabecera identificativa, y las funciones un comentario con lo que hacen.
- [ ] Se ha realizado el testing básico E2E del front-end (completo si se quiere optar a los puntos opcionales).
- [ ] Se ha verificado que no hay problemas ni conflictos con el JavaScript. Si los hay y no se pueden solucionar, se ha identificado el problema y se ha documentado.

### API
- [x] Se ha realizado la identificación de los recursos que utiliza la aplicación, y para cada uno se han implementado los métodos REST adecuados.
- [x] Se han añadido los métodos adicionales necesarios para el correcto funcionamiento de la aplicación.
- [x] Los métodos están lo más desacoplados posibles entre sí, y con respecto a la capa de acceso a datos.
- [x] Se han definido schemas mediante Mongoose para los recursos que se utilizan en la aplicación.
- [x] Se han definido subschemas cuando se pueden utilizar, prefiriéndolos sobre schemas independientes.
- [x] Se ha documentado el API por completo mediante Swagger.
- [x] Todos los endpoint devuelven códigos de respuesta HTTP adecuados según su funcionamiento.
- [x] Se ha introducido un mecanismo de seguridad como JWT para securizar los endpoints.
- [x] Se ha añadido la autenticación a la documentación del API.
- [ ] Se ha revisado el API frente a códigos de conducta en el diseño y desarrollo para buenas API.

### Backend
- [x] El fichero packages.json está bien construido y documentado.
- [x] Se ha estructurado el código como lo visto en clase para el patrón MVC y después en módulos.
- [x] El código no da errores en su ejecución.
- [x] Se realiza logging mediante Winston.
- [x] Todo el código está correctamente documentado. Como mínimo, todos los ficheros tienen una cabecera identificativa, y las funciones un comentario con lo que hacen.
- [ ] Se ha documentado la justificación y utilización de todos los paquetes identificados en el packages.json
- [x] Se han identificado y documentado las limitaciones de la aplicación.
- [x] Se han identificado y documentado los puntos de mejora de la aplicación.

### Validación y testing
- [ ] Se realiza validación de los datos introducidos desde el front-end tanto en el front como en back. Lo ideal es usar los schemas, pero se puede hacer manual si no da tiempo.
- [x] Se ha realizado el testing de front, back y API.
- [ ] Se ha documentado cada uno de los testing realizados. No es necesario mucho nivel de detalle, pero al menos una tabla con las pruebas realizadas.
- [x] Las pruebas se han realizado con éxito.
- [ ] Si hay problemas con alguna prueba, el error se ha identificado y documentado.
- [ ] Hay un testing E2E mínimo.

### Despliegue
- [x] La aplicación se ha desplegado en un proveedor PaaS correctamente, o en un IaaS garantizando escalabilidad, seguridad y resiliencia.
- [ ] Se ha documentado la fase de despliegue, sobre todo si hay más de un PaaS implicado (por ejemplo, uno para back y otro para front).
- [ ] Se ha documentado el startup inicial de la aplicación. Si requiere la carga de datos iniciales, se proporcionan.
- [x] No hay problemas de CORS al utilizar la aplicación.
- [x] Si hay problemas de limitación de funcionalidades (por ejemplo, espacio en ATLAS para la DB), se han identificado y documentado.
- [ ] Se han identificado y documentado las live URL para la aplicación y la documentación del API (Swagger).
- [ ] Se han documentado al menos un usuario administrador y un usuario demo, con su contraseña.
