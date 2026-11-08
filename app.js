(function () {
  const FONDOS = window.FONDOS, VP = window.VP;
  const $ = (id) => document.getElementById(id);
  const escena = $("escena"), verso = $("verso"), cita = $("cita"), barra = $("barra"), contador = $("contador");
  const vacio = $("vacio"), negroEl = $("negro");
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Opciones por dirección: ?t=15 (segundos), ?azar=1, ?inicio=<id>
  const params = new URLSearchParams(location.search);
  let modo = params.get("t") || VP.leer("tiempo") || "auto";
  let azar = params.get("azar") === "1" || VP.leer("azar") === "1";
  const inicio = params.get("inicio");

  // ---------- Fondos: dos lienzos que se cruzan ----------
  const capas = [$("fondoA"), $("fondoB")].map((cv) => ({ cv, c: cv.getContext("2d"), nombre: null, dibujar: null, t0: 0, hasta: 0 }));
  let activa = 0;

  function prepara(capa, nombre) {
    const def = FONDOS[nombre];
    const k = Math.min(window.devicePixelRatio || 1, 1.5) * def.escala;
    capa.cv.width = Math.max(1, Math.round(innerWidth * k));
    capa.cv.height = Math.max(1, Math.round(innerHeight * k));
    capa.nombre = nombre;
    capa.dibujar = def.crear(capa.cv.width, capa.cv.height);
  }
  function cambiaFondo(nombre) {
    if (!FONDOS[nombre]) nombre = "estrellas";
    const actual = capas[activa];
    if (actual.nombre === nombre) return;
    const nueva = capas[1 - activa];
    prepara(nueva, nombre);
    nueva.t0 = performance.now();
    nueva.cv.classList.add("visible");
    actual.cv.classList.remove("visible");
    actual.hasta = performance.now() + 2600;
    activa = 1 - activa;
  }
  addEventListener("resize", () => {
    for (const capa of capas) if (capa.nombre) prepara(capa, capa.nombre);
    ajusta();
  });

  // ---------- Versículos (los que están activos en el panel) ----------
  const activos = () => VP.lista().filter((v) => v.activo !== false && v.texto.trim());
  let VERSOS = activos();
  let orden = [], pos = 0, tocando = true, restante = 0, total = 1, cambiando = false, negro = false, turno = 0;
  const actual = () => VERSOS[orden[pos]];

  function baraja() {
    const a = VERSOS.map((_, i) => i);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    for (let i = 1; i < a.length; i++) {
      if (VERSOS[a[i]].fondo === VERSOS[a[i - 1]].fondo) {
        const j = a.findIndex((v, k) => k > i && VERSOS[v].fondo !== VERSOS[a[i - 1]].fondo);
        if (j > 0) [a[i], a[j]] = [a[j], a[i]];
      }
    }
    return a;
  }
  const nuevoOrden = () => (azar ? baraja() : VERSOS.map((_, i) => i));
  function duracion(v) {
    if (!v) return 10;
    if (modo === "auto") return Math.min(24, Math.max(10, 6 + v.texto.length * 0.07));
    return Number(modo) || 15;
  }

  function pinta(v, quieto) {
    let i = 0;
    verso.innerHTML = "";
    for (const linea of v.texto.split("\n")) {
      const l = document.createElement("span");
      l.className = "linea";
      linea.split(" ").forEach((p, k, arr) => {
        const s = document.createElement("span");
        s.className = "palabra";
        s.style.setProperty("--i", i++);
        s.textContent = p || " ";
        l.appendChild(s);
        if (k < arr.length - 1) l.appendChild(document.createTextNode(" "));
      });
      verso.appendChild(l);
    }
    verso.classList.toggle("quieto", !!quieto);
    cita.classList.toggle("quieto", !!quieto);
    cita.textContent = v.ref;
    cita.hidden = !v.ref.trim();
    cita.style.setProperty("--retraso", (reducido ? 0 : 0.4 + i * 0.075) + "s");
    if (!quieto) { cita.style.animation = "none"; void cita.offsetWidth; cita.style.animation = ""; }
    ajusta();
  }

  // Ajusta el tamaño de letra para que el versículo llene la pantalla sin salirse
  function ajusta() {
    const maxAlto = innerHeight * 0.58;
    let tam = Math.min(innerWidth * (innerWidth < innerHeight ? 0.1 : 0.072), innerHeight * 0.115);
    verso.style.fontSize = tam + "px";
    for (let n = 0; n < 40 && verso.scrollHeight > maxAlto; n++) {
      tam *= 0.95;
      verso.style.fontSize = tam + "px";
    }
  }

  const cuenta = () => { contador.textContent = VERSOS.length ? pos + 1 + " / " + orden.length : "0 / 0"; };
  function muestraVacio() {
    turno++; cambiando = false;
    vacio.hidden = false; escena.hidden = true;
    total = restante = 1;
    cambiaFondo("estrellas");
    cuenta(); avisa();
  }
  function muestra(nuevaPos, conTransicion, forzar) {
    if (!VERSOS.length) return muestraVacio();
    if (cambiando && !forzar) return;
    if (nuevaPos >= orden.length && azar) { orden = baraja(); nuevaPos = 0; }
    const n = orden.length;
    nuevaPos = ((nuevaPos % n) + n) % n;
    const v = VERSOS[orden[nuevaPos]];
    const mi = ++turno;
    const entra = () => {
      if (mi !== turno) return;
      pos = nuevaPos;
      vacio.hidden = true; escena.hidden = false;
      pinta(v);
      escena.classList.remove("saliendo");
      total = restante = duracion(v);
      cambiando = false;
      cuenta(); avisa();
    };
    cambiaFondo(v.fondo);
    if (conTransicion && !escena.hidden) {
      cambiando = true;
      escena.classList.add("saliendo");
      setTimeout(entra, reducido ? 600 : 950);
    } else entra();
  }
  const siguiente = () => muestra(pos + 1, true);
  const anterior = () => muestra(pos - 1, true);

  // Cuando el panel cambia la lista, la tomamos sin cortar lo que está en pantalla
  function recarga() {
    const antes = escena.hidden ? null : actual();
    VERSOS = activos();
    orden = nuevoOrden();
    if (!VERSOS.length) return muestraVacio();
    const i = antes ? VERSOS.findIndex((v) => v.id === antes.id) : -1;
    if (i < 0) return muestra(antes ? Math.min(pos, orden.length - 1) : 0, !!antes, true);
    pos = orden.indexOf(i);
    const v = VERSOS[i];
    if (!cambiando && (v.texto !== antes.texto || v.ref !== antes.ref)) pinta(v, true);
    cambiaFondo(v.fondo);
    cuenta(); avisa();
  }
  function irA(id) {
    VERSOS = activos();
    const i = VERSOS.findIndex((v) => v.id === id);
    if (i < 0) return;
    orden = nuevoOrden();
    muestra(orden.indexOf(i), true, true);
  }

  // ---------- Avisos al panel ----------
  function avisa() {
    if (!VP.canal) return;
    const v = escena.hidden ? null : actual();
    VP.canal.postMessage({ tipo: "estado", id: v ? v.id : null, tocando, negro, restante: Math.max(0, Math.ceil(restante)), pos: pos + 1, n: orden.length });
  }

  // ---------- Bucle ----------
  let antes = performance.now();
  setInterval(avisa, 800);
  function cuadro(ahora) {
    const dt = Math.min(0.1, (ahora - antes) / 1000);
    antes = ahora;
    for (let i = 0; i < 2; i++) {
      const capa = capas[i];
      if (!capa.dibujar) continue;
      if (i === activa || ahora < capa.hasta) capa.dibujar(capa.c, (ahora - capa.t0) / 1000);
    }
    if (tocando && !cambiando && VERSOS.length && !escena.hidden) {
      restante -= dt;
      if (restante <= 0) siguiente();
    }
    barra.style.transform = `scaleX(${Math.max(0, Math.min(1, 1 - restante / total))})`;
    requestAnimationFrame(cuadro);
  }

  // ---------- Controles ----------
  const btnPausa = $("btnPausa"), btnAzar = $("btnAzar"), selTiempo = $("tiempo");
  function ponPausa(p) {
    tocando = !p;
    btnPausa.setAttribute("aria-label", tocando ? "Pausar" : "Reproducir");
    $("icoPausa").innerHTML = tocando
      ? '<rect class="lleno" x="6" y="5" width="4" height="14" rx="1"/><rect class="lleno" x="14" y="5" width="4" height="14" rx="1"/>'
      : '<path class="lleno" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>';
    avisa();
  }
  function ponNegro(b) {
    negro = b;
    negroEl.classList.toggle("activo", b);
    avisa();
  }
  function ponAzar(a, desdeOtro) {
    azar = a;
    btnAzar.setAttribute("aria-pressed", String(a));
    if (!desdeOtro) VP.guardar("azar", a ? "1" : "0");
    const v = actual();
    orden = nuevoOrden();
    if (v) pos = Math.max(0, orden.indexOf(VERSOS.indexOf(v)));
    cuenta();
  }
  function ponModo(m) {
    modo = m || "auto";
    if (![...selTiempo.options].some((o) => o.value === modo)) {
      const o = document.createElement("option"); o.value = modo; o.textContent = modo + " s"; selTiempo.appendChild(o);
    }
    selTiempo.value = modo;
    total = restante = duracion(actual());
  }
  async function pantallaCompleta() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (e) {}
  }

  btnPausa.addEventListener("click", () => ponPausa(tocando));
  $("btnSiguiente").addEventListener("click", siguiente);
  $("btnAnterior").addEventListener("click", anterior);
  $("btnPantalla").addEventListener("click", pantallaCompleta);
  btnAzar.addEventListener("click", () => ponAzar(!azar));
  selTiempo.addEventListener("change", () => { VP.guardar("tiempo", selTiempo.value); ponModo(selTiempo.value); });

  addEventListener("keydown", (e) => {
    if (e.target === selTiempo) return;
    const k = e.key.toLowerCase();
    if (k === " " || k === "k") { e.preventDefault(); ponPausa(tocando); }
    else if (k === "arrowright" || k === "pagedown") siguiente();
    else if (k === "arrowleft" || k === "pageup") anterior();
    else if (k === "f") pantallaCompleta();
    else if (k === "r") ponAzar(!azar);
    else if (k === "b" || k === ".") ponNegro(!negro);
    despierta();
  });

  // Cambios hechos en el panel (misma computadora)
  addEventListener("storage", (e) => {
    if (e.key === VP.CLAVE || e.key === null) recarga();
    else if (e.key === "vp-tiempo") ponModo(e.newValue);
    else if (e.key === "vp-azar") ponAzar(e.newValue === "1", true);
  });
  if (VP.canal) {
    VP.canal.addEventListener("message", (e) => {
      const m = e.data || {};
      if (m.tipo === "ir") irA(m.id);
      else if (m.tipo === "sig") siguiente();
      else if (m.tipo === "ant") anterior();
      else if (m.tipo === "pausa") ponPausa(tocando);
      else if (m.tipo === "negro") ponNegro(!negro);
      else if (m.tipo === "hola") avisa();
    });
  }

  // Esconde controles y cursor cuando nadie mueve el ratón
  let reloj;
  function despierta() {
    document.body.classList.remove("quieto");
    clearTimeout(reloj);
    reloj = setTimeout(() => document.body.classList.add("quieto"), 3200);
  }
  ["mousemove", "pointerdown", "touchstart"].forEach((ev) => addEventListener(ev, despierta, { passive: true }));
  setTimeout(() => $("ayuda").classList.add("fuera"), 7000);

  // Mantiene la pantalla encendida mientras se proyecta
  async function sinApagar() {
    try { if ("wakeLock" in navigator && document.visibilityState === "visible") await navigator.wakeLock.request("screen"); } catch (e) {}
  }
  document.addEventListener("visibilitychange", sinApagar);

  // ---------- Inicio ----------
  ponModo(modo);
  btnAzar.setAttribute("aria-pressed", String(azar));
  orden = nuevoOrden();
  let primero = 0;
  if (inicio) {
    const i = VERSOS.findIndex((v) => v.id === inicio);
    if (i >= 0) primero = Math.max(0, orden.indexOf(i));
  }
  muestra(primero, false);
  ponPausa(false);
  despierta();
  sinApagar();
  if (document.fonts) document.fonts.ready.then(ajusta);
  requestAnimationFrame(cuadro);

  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
