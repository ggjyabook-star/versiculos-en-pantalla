# Versículos en Pantalla

Presentación que corre sola: versículos de la Biblia (Reina-Valera 1909, dominio público) con fondos animados.
Es un sitio estático (HTML, CSS y JS sin dependencias), así que funciona en Vercel, Netlify o GitHub Pages sin configurar nada.

## Uso
- Se abre y empieza sola. `F` pantalla completa, `Espacio` pausa, `←` `→` cambiar, `R` orden al azar.
- Opciones por dirección: `?t=15` (segundos por versículo) y `?azar=1`. Ejemplo: `https://tu-sitio.vercel.app/?t=20&azar=1`
- Después de abrirla una vez con internet, sigue funcionando sin conexión.

## Agregar o cambiar versículos
Edita `versiculos.js`. Cada versículo lleva `ref`, `texto` (usa `\n` para cortar línea) y `fondo`:
`aurora`, `estrellas`, `amanecer`, `rayos`, `luces`, `mar` o `nebulosa`.

## Subir a GitHub y Vercel
```
git init
git add .
git commit -m "Versículos en Pantalla"
git branch -M main
git remote add origin https://github.com/USUARIO/versiculos-en-pantalla.git
git push -u origin main
```
Luego en vercel.com → Add New → Project → importar el repo → Deploy (sin build ni framework).
Cada `git push` vuelve a publicar solo.
