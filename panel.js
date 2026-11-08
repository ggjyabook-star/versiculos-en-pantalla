(function () {
  const VP = window.VP, FONDOS = window.FONDOS, INFO = window.FONDOS_INFO;
  const ORDEN_FONDOS = Object.keys(INFO);
  const $ = (id) => document.getElementById(id);

  let lista = VP.lista();
  let sel = lista[0] ? lista[0].id : null;
  let enPantalla = null, sigPantalla = null, ultimoEstado = 0, estado = {};
  let cajaAzar = null;

  const elLista = $("lista"), elCuantos = $("cuantos"), inCita = $("cita"), inTexto = $("texto");
  const elFondos = $("fondos"), aviso = $("aviso"), guardado = $("guardado");
  const elegido = () => lista.find((v) => v.id === sel);
  const nuevoId = () => "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Altura real de la barra para que la lista lateral quede fija debajo
  const barra = document.querySelector(".barra");
  const midaBarra = () => document.documentElement.style.setProperty("--barra", barra.offsetHeight + "px");
  new ResizeObserver(midaBarra).observe(barra);

  // ---------- Guardar ----------
  let reloj;
  function guarda(inmediato) {
    clearTimeout(reloj);
    const hacer = () => {
      const ok = VP.guardaLista(lista);
      guardado.textContent = ok ? "Guardado en este equipo" : "No se pudo guardar: este navegador no permite guardar datos (¿ventana privada?)";
      guardado.classList.toggle("error", !ok);
    };
    guardado.textContent = "Guardando…";
    if (inmediato) hacer(); else reloj = setTimeout(hacer, 450);
  }

  // ---------- Lista ----------
  const GRIP = '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
  let arrastra = null;

  function cuenta() {
    const activos = lista.filter((v) => v.activo !== false && v.texto.trim()).length;
    elCuantos.textContent = `${activos} de ${lista.length} en la presentación`;
  }
  // Número de turno de cada versículo marcado (en el orden de la lista)
  let numeros = {};
  function numera() {
    numeros = {};
    if (cajaAzar && cajaAzar.checked) return;
    let n = 0;
    for (const v of lista) if (v.activo !== false && v.texto.trim()) numeros[v.id] = ++n;
  }
  function pintaLista() {
    cuenta();
    numera();
    elLista.innerHTML = "";
    for (const v of lista) elLista.appendChild(itemLista(v));
  }
  function rellenaItem(li, v) {
    const ref = li.querySelector(".ref");
    ref.textContent = "";
    if (numeros[v.id]) {
      const n = document.createElement("span");
      n.className = "num"; n.textContent = numeros[v.id];
      n.title = "Turno en la presentación";
      ref.appendChild(n);
    }
    ref.appendChild(document.createTextNode(v.ref.trim() || "Sin cita"));
    if (v.id === enPantalla) {
      const a = document.createElement("span");
      a.className = "aire"; a.textContent = "EN PANTALLA";
      ref.appendChild(a);
    } else if (v.id === sigPantalla) {
      const a = document.createElement("span");
      a.className = "sig-tag"; a.textContent = "SIGUE";
      ref.appendChild(a);
    }
    li.querySelector(".frag").textContent = v.texto.replace(/\n/g, " ").trim() || "Falta el texto";
    const chip = li.querySelector(".chip");
    chip.style.background = (INFO[v.fondo] || INFO.estrellas).color;
    chip.title = "Fondo: " + (INFO[v.fondo] || INFO.estrellas).nombre;
  }
  function itemLista(v) {
    const li = document.createElement("li");
    li.className = "item" + (v.id === sel ? " sel" : "") + (v.activo === false ? " apagado" : "");
    li.draggable = true;
    li.dataset.id = v.id;
    li.innerHTML = `<span class="asa" title="Arrastra para cambiar el orden">${GRIP}</span>
      <input type="checkbox" class="activo" title="Mostrar en la presentación" aria-label="Mostrar en la presentación">
      <button type="button" class="info"><span class="ref"></span><span class="frag"></span></button>
      <span class="chip"></span>`;
    const caja = li.querySelector(".activo");
    caja.checked = v.activo !== false;
    caja.addEventListener("change", () => {
      v.activo = caja.checked;
      guarda(true); pintaLista();
      const otra = elLista.querySelector(`[data-id="${CSS.escape(v.id)}"] .activo`);
      if (otra) otra.focus();
    });
    li.querySelector(".info").addEventListener("click", () => selecciona(v.id));
    rellenaItem(li, v);

    li.addEventListener("dragstart", (e) => {
      arrastra = v.id; li.classList.add("arrastrando");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", v.id); } catch (_) {}
    });
    li.addEventListener("dragend", () => { arrastra = null; li.classList.remove("arrastrando"); limpiaMarcas(); });
    const despues = (e) => { const r = li.getBoundingClientRect(); return e.clientY > r.top + r.height / 2; };
    li.addEventListener("dragover", (e) => {
      if (!arrastra || arrastra === v.id) return;
      e.preventDefault();
      limpiaMarcas();
      li.classList.add(despues(e) ? "marca-abajo" : "marca-arriba");
    });
    li.addEventListener("drop", (e) => {
      if (!arrastra || arrastra === v.id) return;
      e.preventDefault();
      mueve(arrastra, v.id, despues(e));
    });
    return li;
  }
  function limpiaMarcas() {
    elLista.querySelectorAll(".marca-arriba,.marca-abajo").forEach((n) => n.classList.remove("marca-arriba", "marca-abajo"));
  }
  function mueve(id, destinoId, despues) {
    const i = lista.findIndex((x) => x.id === id);
    const [it] = lista.splice(i, 1);
    let j = lista.findIndex((x) => x.id === destinoId);
    if (despues) j++;
    lista.splice(j, 0, it);
    guarda(true); pintaLista();
  }
  function actualizaItem(v) {
    const li = elLista.querySelector(`[data-id="${CSS.escape(v.id)}"]`);
    if (li) rellenaItem(li, v);
    cuenta();
  }

  // ---------- Editor ----------
  function selecciona(id) {
    sel = id;
    pintaLista();
    pintaEditor(true);
    const li = elLista.querySelector(".item.sel");
    if (li) li.scrollIntoView({ block: "nearest" });
  }
  function pintaEditor(forzar) {
    const v = elegido();
    $("editor").hidden = !v;
    $("sinSeleccion").hidden = !!v;
    if (!v) return;
    if (forzar || document.activeElement !== inCita) inCita.value = v.ref;
    if (forzar || document.activeElement !== inTexto) inTexto.value = v.texto;
    for (const b of elFondos.children) b.setAttribute("aria-checked", String(b.dataset.fondo === v.fondo));
    if (forzar) { aviso.textContent = ""; aviso.className = "aviso"; }
    pintaPrevia();
  }
  inCita.addEventListener("input", () => { const v = elegido(); if (!v) return; v.ref = inCita.value; actualizaItem(v); pintaPrevia(); guarda(); });
  inTexto.addEventListener("input", () => { const v = elegido(); if (!v) return; v.texto = inTexto.value; actualizaItem(v); pintaPrevia(); guarda(); });
  inCita.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); traer(); } });

  // ---------- Fondos (miniaturas animadas) ----------
  const miniaturas = [];
  for (const f of ORDEN_FONDOS) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "fondo-op"; b.dataset.fondo = f;
    b.setAttribute("role", "radio");
    const cv = document.createElement("canvas");
    cv.width = 224; cv.height = 126;
    const s = document.createElement("span");
    s.textContent = INFO[f].nombre;
    b.append(cv, s);
    b.addEventListener("click", () => {
      const v = elegido(); if (!v) return;
      v.fondo = f; guarda(true); pintaEditor(); actualizaItem(v);
    });
    elFondos.appendChild(b);
    miniaturas.push({ c: cv.getContext("2d"), dibujar: FONDOS[f].crear(cv.width, cv.height) });
  }

  // ---------- Vista previa ----------
  const previa = $("previa"), lienzo = $("lienzoPrevia"), ctxP = lienzo.getContext("2d"), pVerso = $("pVerso"), pCita = $("pCita");
  let escenaP = { nombre: null, dibujar: null, t0: performance.now() };
  function preparaPrevia(nombre) {
    const k = Math.min(window.devicePixelRatio || 1, 1.5) * FONDOS[nombre].escala;
    lienzo.width = Math.max(1, Math.round(previa.clientWidth * k));
    lienzo.height = Math.max(1, Math.round(previa.clientHeight * k));
    escenaP = { nombre, dibujar: FONDOS[nombre].crear(lienzo.width, lienzo.height), t0: escenaP.nombre === nombre ? escenaP.t0 : performance.now() };
  }
  function pintaPrevia() {
    const v = elegido(); if (!v) return;
    const f = FONDOS[v.fondo] ? v.fondo : "estrellas";
    if (escenaP.nombre !== f) preparaPrevia(f);
    pVerso.innerHTML = "";
    if (v.texto.trim()) {
      for (const l of v.texto.split("\n")) {
        const s = document.createElement("span");
        s.className = "linea"; s.textContent = l || " ";
        pVerso.appendChild(s);
      }
    } else pVerso.innerHTML = '<span class="linea fantasma">Aquí aparecerá el versículo</span>';
    pCita.textContent = v.ref.trim();
    pCita.hidden = !v.ref.trim();
    ajustaPrevia();
  }
  function ajustaPrevia() {
    const W = previa.clientWidth, H = previa.clientHeight;
    if (!W) return;
    let tam = Math.min(W * 0.072, H * 0.115);
    pVerso.style.fontSize = tam + "px";
    for (let n = 0; n < 40 && pVerso.scrollHeight > H * 0.58; n++) { tam *= 0.95; pVerso.style.fontSize = tam + "px"; }
    pCita.style.fontSize = Math.max(10, W * 0.023) + "px";
  }
  new ResizeObserver(() => { if (escenaP.nombre) preparaPrevia(escenaP.nombre); ajustaPrevia(); }).observe(previa);

  let cuadroN = 0;
  function cuadro(ahora) {
    if (escenaP.dibujar && !$("editor").hidden) escenaP.dibujar(ctxP, (ahora - escenaP.t0) / 1000);
    // las miniaturas a medio ritmo para no cansar la computadora
    if (cuadroN++ % 2 === 0) for (const m of miniaturas) m.dibujar(m.c, ahora / 1000);
    requestAnimationFrame(cuadro);
  }

  // ---------- Traer texto de la Biblia (Reina-Valera 1909) ----------
  const LIBROS = ["Génesis","Éxodo","Levítico","Números","Deuteronomio","Josué","Jueces","Rut","1 Samuel","2 Samuel","1 Reyes","2 Reyes","1 Crónicas","2 Crónicas","Esdras","Nehemías","Ester","Job","Salmos","Proverbios","Eclesiastés","Cantares","Isaías","Jeremías","Lamentaciones","Ezequiel","Daniel","Oseas","Joel","Amós","Abdías","Jonás","Miqueas","Nahúm","Habacuc","Sofonías","Hageo","Zacarías","Malaquías","Mateo","Marcos","Lucas","Juan","Hechos","Romanos","1 Corintios","2 Corintios","Gálatas","Efesios","Filipenses","Colosenses","1 Tesalonicenses","2 Tesalonicenses","1 Timoteo","2 Timoteo","Tito","Filemón","Hebreos","Santiago","1 Pedro","2 Pedro","1 Juan","2 Juan","3 Juan","Judas","Apocalipsis"];
  const POETICOS = new Set(["Job", "Salmos", "Proverbios", "Eclesiastés", "Cantares", "Lamentaciones", "Isaías"]);
  const sinAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const CLAVES = LIBROS.map((l) => sinAcento(l).replace(/[\s.]/g, ""));
  const ALIAS = {
    gn: "genesis", gen: "genesis", ex: "exodo", lv: "levitico", lev: "levitico", nm: "numeros", num: "numeros", dt: "deuteronomio", deut: "deuteronomio",
    jos: "josue", jue: "jueces", sam: "samuel", s: "samuel", re: "reyes", rey: "reyes", r: "reyes", cr: "cronicas", cro: "cronicas", cron: "cronicas",
    neh: "nehemias", est: "ester", sal: "salmos", salmo: "salmos", sl: "salmos", pr: "proverbios", prov: "proverbios", ec: "eclesiastes", ecl: "eclesiastes",
    cnt: "cantares", cant: "cantares", cantar: "cantares", cantardeloscantares: "cantares", is: "isaias", isa: "isaias", jer: "jeremias", lm: "lamentaciones", lam: "lamentaciones",
    ez: "ezequiel", eze: "ezequiel", dn: "daniel", dan: "daniel", os: "oseas", jl: "joel", am: "amos", abd: "abdias", jon: "jonas", mi: "miqueas", miq: "miqueas",
    nah: "nahum", hab: "habacuc", sof: "sofonias", hag: "hageo", zac: "zacarias", mal: "malaquias",
    mt: "mateo", mat: "mateo", mc: "marcos", mr: "marcos", lc: "lucas", jn: "juan", hch: "hechos", hech: "hechos", ro: "romanos", rom: "romanos",
    co: "corintios", cor: "corintios", ga: "galatas", gal: "galatas", ef: "efesios", efe: "efesios", fil: "filipenses", flp: "filipenses", col: "colosenses",
    ts: "tesalonicenses", tes: "tesalonicenses", ti: "timoteo", tim: "timoteo", tit: "tito", flm: "filemon", heb: "hebreos", stg: "santiago", sant: "santiago",
    pe: "pedro", ped: "pedro", jud: "judas", ap: "apocalipsis", apoc: "apocalipsis",
  };
  function buscaLibro(nombre) {
    const k0 = sinAcento(nombre).replace(/[\s.]/g, "");
    const m = k0.match(/^([123])(.*)$/);
    const num = m ? m[1] : "";
    let base = m ? m[2] : k0;
    if (ALIAS[base]) base = ALIAS[base];
    const k = num + base;
    let i = CLAVES.indexOf(k);
    if (i < 0 && base.length >= 2) i = CLAVES.findIndex((c) => c.startsWith(k) && (num || !/^\d/.test(c)));
    return i;
  }
  function interpreta(t) {
    const m = t.trim().match(/^([123]?\s*[^\d:]+?)\s*(\d+)(?:\s*[:.,\s]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/);
    if (!m) return null;
    const i = buscaLibro(m[1]);
    if (i < 0) return { error: `No encontré el libro «${m[1].trim()}». Escribe por ejemplo Juan 3:16.` };
    if (!m[3]) return { error: `Agrega el versículo, por ejemplo ${LIBROS[i]} ${m[2]}:1.` };
    const ini = +m[3], fin = m[4] ? +m[4] : ini;
    if (fin < ini) return { error: "El rango va al revés. Escribe por ejemplo Salmos 23:1-3." };
    if (fin - ini > 9) return { error: "Son muchos versículos para una sola pantalla. Pon máximo 10." };
    return { num: i + 1, libro: LIBROS[i], cap: +m[2], ini, fin };
  }
  const ACROSTICO = /^(ALEPH|BETH|GIMEL|DALETH|HE|VAU|ZAIN|CHETH|TETH|JOD|CAPH|LAMED|MEM|NUN|SAMECH|AIN|PE|TZADDI|COPH|RESH|SIN|TAU)\.\s+/;
  function moderniza(t) {
    return t
      .replace(/\s+/g, " ").trim()
      .replace(ACROSTICO, "")
      .replace(/(^|[^\p{L}])á(?=[^\p{L}]|$)/gu, "$1a")
      .replace(/(^|[^\p{L}])Á(?=[^\p{L}]|$)/gu, "$1A")
      .replace(/(^|[^\p{L}])é(?=[^\p{L}]|$)/gu, "$1e")
      .replace(/(^|[^\p{L}])ó(?=[^\p{L}]|$)/gu, "$1o")
      .replace(/^([A-ZÁÉÍÓÚÑ])([A-ZÁÉÍÓÚÑ]+)(?=[^\p{L}])/u, (m, a, b) => a + b.toLowerCase())
      .replace(/(?<!\p{L})(F|f)ué(?!\p{L})/gu, "$1ue")
      .replace(/(?<!\p{L})dió(?!\p{L})/gu, "dio").replace(/(?<!\p{L})vió(?!\p{L})/gu, "vio").replace(/(?<!\p{L})fuí(?!\p{L})/gu, "fui");
  }
  function avisa(txt, tipo) { aviso.textContent = txt; aviso.className = "aviso" + (tipo ? " " + tipo : ""); }

  async function traer() {
    const v = elegido(); if (!v) return;
    const p = interpreta(inCita.value);
    if (!p) return avisa("Escribe la cita así: Juan 3:16 o Salmos 23:1-3", "error");
    if (p.error) return avisa(p.error, "error");
    avisa("Buscando en la Reina-Valera 1909…");
    try {
      const r = await fetch(`https://api.getbible.net/v2/valera/${p.num}/${p.cap}.json`);
      if (!r.ok) return avisa(`${p.libro} no tiene capítulo ${p.cap}.`, "error");
      const d = await r.json();
      const partes = (d.verses || []).filter((x) => x.verse >= p.ini && x.verse <= p.fin).map((x) => moderniza(x.text));
      if (!partes.length) return avisa(`${p.libro} ${p.cap} no tiene el versículo ${p.ini}.`, "error");
      if (elegido() !== v) return;
      v.texto = partes.join(POETICOS.has(p.libro) ? "\n" : " ");
      v.ref = `${p.libro} ${p.cap}:${p.ini}${p.fin !== p.ini ? "-" + p.fin : ""}`;
      inCita.value = v.ref; inTexto.value = v.texto;
      actualizaItem(v); pintaPrevia(); guarda(true);
      avisa("Listo. Si quieres, corrige o corta el texto abajo.", "ok");
    } catch (e) {
      avisa("No pude traer el texto (¿sin internet?). Puedes escribirlo a mano abajo.", "error");
    }
  }
  $("traer").addEventListener("click", traer);

  // ---------- Botones que piden confirmar con un segundo toque ----------
  function dobleToque(boton, texto, accion) {
    const original = boton.innerHTML;
    let armado = false, t;
    boton.addEventListener("click", () => {
      if (!armado) {
        armado = true; boton.classList.add("confirmar"); boton.textContent = texto;
        t = setTimeout(() => { armado = false; boton.classList.remove("confirmar"); boton.innerHTML = original; }, 3500);
        return;
      }
      clearTimeout(t); armado = false; boton.classList.remove("confirmar"); boton.innerHTML = original;
      accion();
    });
  }

  // ---------- Acciones ----------
  $("agregar").addEventListener("click", () => {
    const actual = elegido();
    const nuevo = { id: nuevoId(), ref: "", texto: "", fondo: actual ? actual.fondo : "estrellas", activo: true };
    const i = actual ? lista.indexOf(actual) + 1 : lista.length;
    lista.splice(i, 0, nuevo);
    guarda(true);
    selecciona(nuevo.id);
    inCita.focus();
    avisa("Escribe la cita y toca «Traer el texto de la Biblia», o escribe el texto a mano.");
  });
  $("duplicar").addEventListener("click", () => {
    const v = elegido(); if (!v) return;
    const copia = { ...v, id: nuevoId() };
    lista.splice(lista.indexOf(v) + 1, 0, copia);
    guarda(true); selecciona(copia.id);
  });
  function corre(d) {
    const v = elegido(); if (!v) return;
    const i = lista.indexOf(v), j = i + d;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    guarda(true); pintaLista();
  }
  $("subir").addEventListener("click", () => corre(-1));
  $("bajar").addEventListener("click", () => corre(1));
  dobleToque($("eliminar"), "¿Eliminar? Toca otra vez", () => {
    const v = elegido(); if (!v) return;
    const i = lista.indexOf(v);
    lista.splice(i, 1);
    guarda(true);
    sel = lista[Math.min(i, lista.length - 1)] ? lista[Math.min(i, lista.length - 1)].id : null;
    pintaLista(); pintaEditor(true);
  });
  dobleToque($("fondoTodos"), "¿Cambiar el fondo de todos? Toca otra vez", () => {
    const v = elegido(); if (!v) return;
    for (const x of lista) x.fondo = v.fondo;
    guarda(true); pintaLista();
    avisa(`Todos los versículos tienen ahora el fondo ${INFO[v.fondo].nombre}.`, "ok");
  });
  dobleToque($("restaurar"), "¿Borrar tus cambios y volver a los originales? Toca otra vez", () => {
    lista = VP.porDefecto();
    sel = lista[0] ? lista[0].id : null;
    guarda(true); pintaLista(); pintaEditor(true);
  });

  // Copia en archivo
  $("exportar").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ versiculos: lista }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "versiculos-en-pantalla.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $("importar").addEventListener("click", () => $("archivo").click());
  $("archivo").addEventListener("change", async () => {
    const f = $("archivo").files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      const l = VP.limpia(Array.isArray(d) ? d : d.versiculos || []);
      if (!l.length) throw new Error("vacío");
      lista = l; sel = lista[0].id;
      guarda(true); pintaLista(); pintaEditor(true);
      guardado.textContent = `Se cargaron ${l.length} versículos del archivo`;
    } catch (e) {
      guardado.textContent = "Ese archivo no tiene versículos de esta presentación.";
      guardado.classList.add("error");
    }
    $("archivo").value = "";
  });

  // Ajustes de la presentación
  const selTiempo = $("tiempo");
  cajaAzar = $("azar");
  let ultimoAuto = "auto";
  function pintaModo() {
    const manual = selTiempo.value === "manual";
    $("mAuto").setAttribute("aria-pressed", String(!manual));
    $("mManual").setAttribute("aria-pressed", String(manual));
    if (!manual) ultimoAuto = selTiempo.value;
  }
  function ponTiempo(v) {
    selTiempo.value = v;
    if (!selTiempo.value) selTiempo.value = "auto";
    VP.guardar("tiempo", selTiempo.value);
    pintaModo();
  }
  selTiempo.value = VP.leer("tiempo") || "auto";
  if (!selTiempo.value) selTiempo.value = "auto";
  cajaAzar.checked = VP.leer("azar") === "1";
  pintaModo();
  selTiempo.addEventListener("change", () => ponTiempo(selTiempo.value));
  $("mAuto").addEventListener("click", () => ponTiempo(ultimoAuto));
  $("mManual").addEventListener("click", () => ponTiempo("manual"));
  cajaAzar.addEventListener("change", () => { VP.guardar("azar", cajaAzar.checked ? "1" : "0"); pintaLista(); });

  // Elegir varios de un jalón
  $("marcarTodos").addEventListener("click", () => { for (const v of lista) v.activo = true; guarda(true); pintaLista(); });
  $("desmarcarTodos").addEventListener("click", () => {
    for (const v of lista) v.activo = false;
    guarda(true); pintaLista();
    avisa("Ahora marca solo los versículos que vas a usar.");
  });

  // ---------- Control de la proyección ----------
  const manda = (m) => VP.canal && VP.canal.postMessage(m);
  const viva = () => Date.now() - ultimoEstado < 2500;
  function abreProyeccion(inicio) {
    const url = "./" + (inicio ? "?inicio=" + encodeURIComponent(inicio) : "");
    const w = window.open(url, "vp-proyeccion");
    if (!w) location.href = url;
  }
  $("abrir").addEventListener("click", () => (viva() ? abreProyeccion() : abreProyeccion(sel)));
  $("rAnt").addEventListener("click", () => manda({ tipo: "ant" }));
  $("rSig").addEventListener("click", () => manda({ tipo: "sig" }));
  $("rPausa").addEventListener("click", () => manda({ tipo: "pausa" }));
  $("rNegro").addEventListener("click", () => manda({ tipo: "negro" }));
  $("proyectar").addEventListener("click", () => {
    const v = elegido(); if (!v) return;
    if (!v.texto.trim()) return avisa("Primero escribe el texto del versículo.", "error");
    if (v.activo === false) { v.activo = true; pintaLista(); }
    guarda(true);
    if (viva()) manda({ tipo: "ir", id: v.id });
    else abreProyeccion(v.id);
  });

  function pintaRemoto() {
    const ok = viva();
    $("remoto").classList.toggle("apagado", !ok);
    if (!ok) {
      $("enAire").textContent = "La proyección no está abierta";
      if (enPantalla || sigPantalla) { enPantalla = sigPantalla = null; pintaLista(); }
      return;
    }
    const v = lista.find((x) => x.id === estado.id);
    const s = lista.find((x) => x.id === estado.sigId);
    let t = v ? `En pantalla: ${v.ref || "sin cita"}` : "Proyección abierta";
    if (estado.negro) t = "Pantalla en negro · " + t;
    if (estado.manual) t += s && s !== v ? ` · sigue: ${s.ref || "sin cita"}` : "";
    else t += estado.tocando ? ` · cambia en ${estado.restante} s` : " · en pausa";
    $("enAire").textContent = t;
    $("rNegro").setAttribute("aria-pressed", String(!!estado.negro));
    $("rPausaIco").innerHTML = estado.tocando
      ? '<rect class="lleno" x="6" y="5" width="4" height="14" rx="1"/><rect class="lleno" x="14" y="5" width="4" height="14" rx="1"/>'
      : '<path class="lleno" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>';
  }
  if (VP.canal) {
    VP.canal.addEventListener("message", (e) => {
      const m = e.data || {};
      if (m.tipo !== "estado") return;
      estado = m; ultimoEstado = Date.now();
      if (enPantalla !== m.id || sigPantalla !== m.sigId) { enPantalla = m.id; sigPantalla = m.sigId; pintaLista(); }
      pintaRemoto();
    });
    manda({ tipo: "hola" });
  }

  // Siguiente/anterior con el teclado o con un control de presentación (manda → o AvPág)
  addEventListener("keydown", (e) => {
    const t = e.target;
    if (t.closest && t.closest("input, textarea, select, [contenteditable]")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === "ArrowRight" || k === "PageDown") { e.preventDefault(); manda({ tipo: "sig" }); }
    else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); manda({ tipo: "ant" }); }
    else if (k === "b" || k === "B" || k === ".") manda({ tipo: "negro" });
  });
  setInterval(pintaRemoto, 1000);

  // Si otra pestaña del panel cambia la lista, la tomamos
  addEventListener("storage", (e) => {
    if (e.key === VP.CLAVE) {
      lista = VP.lista();
      if (!elegido()) sel = lista[0] ? lista[0].id : null;
      pintaLista(); pintaEditor();
    } else if (e.key === "vp-tiempo") { selTiempo.value = e.newValue || "auto"; if (!selTiempo.value) selTiempo.value = "auto"; pintaModo(); }
    else if (e.key === "vp-azar") { cajaAzar.checked = e.newValue === "1"; pintaLista(); }
  });

  // ---------- Inicio ----------
  midaBarra();
  pintaLista();
  pintaEditor(true);
  if (document.fonts) document.fonts.ready.then(ajustaPrevia);
  requestAnimationFrame(cuadro);
})();
