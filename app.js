(function () {
  const VERSOS = window.VERSICULOS;
  const FONDOS = window.FONDOS;
  const $ = (id) => document.getElementById(id);
  const escena = $("escena"), verso = $("verso"), cita = $("cita"), barra = $("barra"), contador = $("contador");
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Opciones por dirección: ?t=15 (segundos) y ?azar=1
  const params = new URLSearchParams(location.search);
  let modo = params.get("t") || leer("tiempo") || "auto";
  let azar = params.get("azar") === "1" || leer("azar") === "1";
  function leer(k) { try { return localStorage.getItem("vp-" + k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem("vp-" + k, v); } catch (e) {} }

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

  // ---------- Versículos ----------
  let orden = VERSOS.map((_, i) => i);
  let pos = 0, tocando = true, restante = 0, total = 1, cambiando = false;

  function baraja() {
    const a = VERSOS.map((_, i) => i);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    // evita dos fondos iguales seguidos
    for (let i = 1; i < a.length; i++) {
      if (VERSOS[a[i]].fondo === VERSOS[a[i - 1]].fondo) {
        const j = a.findIndex((v, k) => k > i && VERSOS[v].fondo !== VERSOS[a[i - 1]].fondo);
        if (j > 0) [a[i], a[j]] = [a[j], a[i]];
      }
    }
    return a;
  }
  function duracion(v) {
    if (modo === "auto") return Math.min(24, Math.max(10, 6 + v.texto.length * 0.07));
    return Number(modo) || 15;
  }

  function pinta(v) {
    let i = 0;
    verso.innerHTML = "";
    for (const linea of v.texto.split("\n")) {
      const l = document.createElement("span");
      l.className = "linea";
      linea.split(" ").forEach((p, k, arr) => {
        const s = document.createElement("span");
        s.className = "palabra";
        s.style.setProperty("--i", i++);
        s.textContent = p;
        l.appendChild(s);
        if (k < arr.length - 1) l.appendChild(document.createTextNode(" "));
      });
      verso.appendChild(l);
    }
    cita.textContent = v.ref;
    cita.style.setProperty("--retraso", (reducido ? 0 : 0.4 + i * 0.075) + "s");
    // reinicia la animación de la cita
    cita.style.animation = "none"; void cita.offsetWidth; cita.style.animation = "";
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

  function muestra(nuevaPos, conTransicion) {
    if (cambiando) return;
    const n = orden.length;
    nuevaPos = ((nuevaPos % n) + n) % n;
    if (nuevaPos === 0 && pos === n - 1 && azar) { orden = baraja(); }
    const v = VERSOS[orden[nuevaPos]];
    const entra = () => {
      pos = nuevaPos;
      pinta(v);
      escena.classList.remove("saliendo");
      total = restante = duracion(v);
      contador.textContent = pos + 1 + " / " + n;
      cambiando = false;
    };
    cambiaFondo(v.fondo);
    if (conTransicion) {
      cambiando = true;
      escena.classList.add("saliendo");
      setTimeout(entra, reducido ? 600 : 950);
    } else entra();
  }
  const siguiente = () => muestra(pos + 1, true);
  const anterior = () => muestra(pos - 1, true);

  // ---------- Bucle ----------
  let antes = performance.now();
  function cuadro(ahora) {
    const dt = Math.min(0.1, (ahora - antes) / 1000);
    antes = ahora;
    for (let i = 0; i < 2; i++) {
      const capa = capas[i];
      if (!capa.dibujar) continue;
      if (i === activa || ahora < capa.hasta) capa.dibujar(capa.c, (ahora - capa.t0) / 1000);
    }
    if (tocando && !cambiando) {
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
  }
  function ponAzar(a) {
    azar = a;
    btnAzar.setAttribute("aria-pressed", String(a));
    guardar("azar", a ? "1" : "0");
    const actual = orden[pos];
    orden = a ? baraja() : VERSOS.map((_, i) => i);
    pos = Math.max(0, orden.indexOf(actual));
    contador.textContent = pos + 1 + " / " + orden.length;
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
  if (![...selTiempo.options].some((o) => o.value === modo)) {
    const o = document.createElement("option"); o.value = modo; o.textContent = modo + " s"; selTiempo.appendChild(o);
  }
  selTiempo.value = modo;
  selTiempo.addEventListener("change", () => {
    modo = selTiempo.value; guardar("tiempo", modo);
    total = restante = duracion(VERSOS[orden[pos]]);
  });

  addEventListener("keydown", (e) => {
    if (e.target === selTiempo) return;
    const k = e.key.toLowerCase();
    if (k === " " || k === "k") { e.preventDefault(); ponPausa(tocando); }
    else if (k === "arrowright" || k === "pagedown") siguiente();
    else if (k === "arrowleft" || k === "pageup") anterior();
    else if (k === "f") pantallaCompleta();
    else if (k === "r") ponAzar(!azar);
    despierta();
  });

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
  let candado = null;
  async function sinApagar() {
    try { if ("wakeLock" in navigator && document.visibilityState === "visible") candado = await navigator.wakeLock.request("screen"); } catch (e) {}
  }
  document.addEventListener("visibilitychange", sinApagar);

  // ---------- Inicio ----------
  if (azar) { orden = baraja(); btnAzar.setAttribute("aria-pressed", "true"); }
  muestra(0, false);
  ponPausa(false);
  despierta();
  sinApagar();
  if (document.fonts) document.fonts.ready.then(ajusta);
  requestAnimationFrame(cuadro);

  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
