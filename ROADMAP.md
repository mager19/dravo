# Roadmap — Linia

## En progreso / próximo

### ✅ Copy / Paste / Duplicate
- `Ctrl+C` copia los shapes seleccionados al clipboard interno
- `Ctrl+V` pega con un offset de ~10px (acumulativo en múltiples pastes)
- `Ctrl+D` duplica directamente sin pasar por el clipboard del sistema

### ✅ Conectores curvos + etiquetas en conectores
- Conectores Bezier curvos como alternativa a los rectos actuales
- Punto de control arrastrable para ajustar la curva
- Etiqueta de texto sobre el conector (doble click para editar)
- Toggle recto/curvo por conector (opciones en panel de propiedades)

### ✅ Panel de elementos (capas)
- Panel lateral derecho con la lista de todos los shapes del canvas
- Selección, duplicado y eliminación desde el panel
- Shift+click para multi-select
- Persistente (permanece abierto hasta cerrarse manualmente)

### ✅ Panel de propiedades colapsable
- Sidebar izquierdo con todas las opciones de edición (trazo, relleno, estilo, grosor, opacidad)
- Opciones contextuales: texto cuando hay texto seleccionado, conector cuando hay conector
- Animación de deslizamiento izquierda/derecha con pestaña visible al colapsar
- Reemplaza los paneles horizontales del fondo (ColorPicker, TextOptions, ConnectorOptions)

### Alinear y distribuir ⭐
Barra contextual que aparece al seleccionar múltiples shapes.
- Alinear: izquierda, centro horizontal, derecha, arriba, centro vertical, abajo
- Distribuir: espacio equidistante horizontal y vertical
- Referencia: el bounding box de la selección completa

### Group & Ungroup
Agrupar shapes para moverlos y transformarlos juntos.
- Tipo `group` en el store con `childIds: string[]`
- Hijos siguen siendo shapes planos con un `groupId`
- Al seleccionar un miembro se auto-seleccionan todos
- Atajos: `Ctrl+G` para agrupar, `Ctrl+Shift+G` para desagrupar

### Compartir con Supabase
Generar un link único para compartir o recuperar un canvas.
- Tabla `canvases(id, data, created_at, expires_at)`
- Link tipo `/s/abc123`, expiración por defecto 30 días
- Protección: límite de tamaño de payload (200KB) + rate limit por IP en Edge Function
- `pg_cron` para borrar registros expirados automáticamente
- Sin cuentas: links efímeros. Auth vendría después si se necesita persistencia real.

---

## Ideas para potenciar el proyecto

### Calidad de vida (alto impacto, bajo costo)
- ~~**Copy / Paste / Duplicate**~~ ✅ Implementado
- **Alinear y distribuir** — barra contextual al seleccionar múltiples shapes: alinear al eje, distribuir equidistante. Muy útil para diagramas prolijos.
- **Snap a grilla** — cuadrícula opcional con magnetismo. Ayuda mucho al alineamiento manual.
- **Zoom to fit / zoom to selection** — atajo para encuadrar todo el canvas o lo seleccionado.
- **Lock shapes** — bloquear un shape para que no se pueda mover ni editar accidentalmente.

### Shapes y conectores
- **Más formas básicas** — diamante (decisión), triángulo, hexágono, speech bubble. Expande los casos de uso de diagramas.
- ~~**Conectores curvos (Bezier)**~~ ✅ Implementado
- ~~**Etiquetas en conectores**~~ ✅ Implementado
- **Estilos de punta de flecha** — círculo, diamante, sin punta. Más expresividad para diagramas UML/ER.

### Contenido enriquecido
- **Embed de imágenes** — arrastrar un PNG/JPG al canvas. Muy pedido en tools de whiteboard.
- **Texto multilínea con word wrap** — el texto actual es de una línea. Bloques de texto son clave para notas.
- **Exportar SVG** — además del PNG actual. SVG es escalable y se puede importar en Figma/Illustrator.

### Colaboración (largo plazo)
- **Real-time collab** — Supabase Realtime + Y.js (CRDTs). Alta complejidad pero es lo que llevaría el proyecto a otro nivel.
- **Vista de solo lectura** — al compartir el link, opción de `?mode=view` sin poder editar.
- **Historial de versiones** — guardar snapshots del canvas con Supabase, poder recuperar versiones anteriores.

### Organización del canvas
- **Páginas / frames** — múltiples páginas dentro del mismo documento.
- ~~**Panel de capas**~~ ✅ Implementado como "Panel de elementos"
- **Miniomapa** — vista miniatura para canvas grandes.
- **Reordenar z-order** — subir/bajar shapes en el panel de elementos (drag & drop o botones)

---

### Librería de componentes (requiere auth)
Bloqueado hasta tener sistema de login y persistencia de usuario.
- Guardar shapes o grupos como "componentes" reutilizables nombrados
- Panel lateral con librería propia del usuario
- Instanciar componentes en el canvas con drag & drop desde la librería
- Editar el "master" del componente propaga cambios a todas las instancias

---

## Descartado / pospuesto
- **Shapes anidados (frames)** — requiere coordenadas relativas, jerarquía de shapes, z-order complejo. No vale la pena sin un caso de uso claro.
- **Auth / cuentas** — se puede agregar sobre el sharing de Supabase si hay demanda, pero no es necesario desde el inicio.
