# Versículos en Pantalla

Presentación que corre sola: versículos de la Biblia (Reina-Valera 1909, dominio público) con fondos animados, y un panel para cambiar los versículos y los fondos.
Es un sitio estático (HTML, CSS y JS sin dependencias). Publicado en https://versiculos-en-pantalla.vercel.app

## Proyección (`/`)
- Se abre y empieza sola. `F` pantalla completa, `Espacio` pausa, `←` `→` cambiar, `R` orden al azar, `B` pantalla en negro.
- Opciones por dirección: `?t=15` (segundos por versículo) y `?azar=1`.
- Después de abrirla una vez con internet, sigue funcionando sin conexión.

## Panel (`/panel`)
- Agregar, editar, duplicar, eliminar y ordenar versículos (arrastrando o con Subir/Bajar).
- Escribe la cita (por ejemplo `Sal 46:10`) y «Traer el texto de la Biblia» llena el texto de la RVR1909.
- 9 fondos: Estrellitas, Aurora, Amanecer, Rayos de luz, Luces, Mar, Nebulosa, Luciérnagas y Nubes.
- Control remoto de la proyección: anterior, pausa, siguiente, negro y «Proyectar este ahora».
- Todo se guarda en el navegador de esa computadora; panel y proyección deben abrirse en el mismo navegador.
  Para llevar la lista a otra computadora: «Guardar copia en archivo» y «Cargar desde archivo».

## Archivos
- `versiculos.js`: los versículos de fábrica (se usan si el panel no tiene cambios guardados).
- `fondos.js`: los fondos animados.
- `comun.js`: lista compartida entre panel y proyección.
- `app.js` / `index.html`: proyección. `panel.js` / `panel.html`: panel.
- `sw.js`: copia para usar sin internet. Sube `VERSION` en cada cambio.

## Publicar cambios
Cada `git push` a `main` en GitHub (ggjyabook-star/versiculos-en-pantalla) publica solo en Vercel.
