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

  const elCanciones = $("listaCanciones");
  const esCancion = (v) => v.tipo === "cancion";
  const listaDe = (v) => (esCancion(v) ? elCanciones : elLista);
  const buscaLi = (id) => document.querySelector(`.lado [data-id="${CSS.escape(id)}"]`);
  function cuenta() {
    const otros = lista.filter((v) => !esCancion(v)), canciones = lista.filter(esCancion);
    const on = (l) => l.filter((v) => v.activo !== false && VP.tieneContenido(v)).length;
    elCuantos.textContent = `${on(otros)} de ${otros.length} en la presentación`;
    $("cuantasCanciones").textContent = canciones.length ? `${on(canciones)} de ${canciones.length} en la presentación` : "";
    $("sinCanciones").hidden = canciones.length > 0;
  }
  // Número de turno de cada elemento marcado (primero versículos e imágenes, luego canciones)
  let numeros = {};
  function numera() {
    numeros = {};
    if (cajaAzar && cajaAzar.checked) return;
    let n = 0;
    for (const v of VP.ordenados(lista)) if (v.activo !== false && VP.tieneContenido(v)) numeros[v.id] = ++n;
  }
  // Filtro de canciones (búsqueda y «solo marcadas»); se muestran hasta 150 a la vez para que el panel no se ponga lento
  let filtro = "", soloMarcadas = false;
  const normal = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const pasaFiltro = (v) =>
    (!soloMarcadas || v.activo !== false) &&
    (!filtro || normal(v.ref).includes(filtro) || normal(v.texto).includes(filtro));
  function pintaLista() {
    cuenta();
    numera();
    elLista.innerHTML = "";
    elCanciones.innerHTML = "";
    const MAX = 150;
    let vistas = 0, ocultas = 0;
    const frag = document.createDocumentFragment();
    for (const v of lista) {
      if (!esCancion(v)) { elLista.appendChild(itemLista(v)); continue; }
      if (!pasaFiltro(v) && v.id !== sel) continue;
      if (vistas >= MAX && v.id !== sel) { ocultas++; continue; }
      frag.appendChild(itemLista(v)); vistas++;
    }
    elCanciones.appendChild(frag);
    const mas = $("masCanciones");
    mas.hidden = !ocultas && !(filtro && !vistas);
    mas.textContent = filtro && !vistas ? "Ninguna canción coincide con la búsqueda." : `Hay ${ocultas} canciones más. Escribe en el buscador para encontrarlas.`;
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
    ref.appendChild(document.createTextNode(v.ref.trim() || (v.tipo === "imagen" ? "Imagen" : esCancion(v) ? "Canción sin título" : "Sin cita")));
    if (v.id === enPantalla) {
      const a = document.createElement("span");
      a.className = "aire"; a.textContent = "EN PANTALLA";
      ref.appendChild(a);
    } else if (v.id === sigPantalla) {
      const a = document.createElement("span");
      a.className = "sig-tag"; a.textContent = "SIGUE";
      ref.appendChild(a);
    }
    const chip = li.querySelector(".chip");
    if (esCancion(v) && v.paginas.length) {
      li.querySelector(".frag").textContent = `Canción · ${v.paginas.length} página${v.paginas.length > 1 ? "s" : ""} de PDF`;
      chip.classList.add("foto");
      chip.title = "Presentación en PDF";
      chip.style.background = "#000";
      VP.imagenes.url(v.paginas[0]).then((u) => { if (u) chip.style.background = `#000 url("${u}")`; });
      return;
    }
    if (esCancion(v)) {
      const n = VP.estrofas(v.texto).length;
      chip.classList.remove("foto");
      li.querySelector(".frag").textContent = n ? `Canción · ${n} estrofa${n > 1 ? "s" : ""}` : "Falta la letra";
      chip.style.background = (INFO[v.fondo] || INFO.estrellas).color;
      chip.title = "Fondo: " + (INFO[v.fondo] || INFO.estrellas).nombre;
      return;
    }
    if (v.tipo === "imagen") {
      li.querySelector(".frag").textContent = "Imagen · " + (v.ajuste === "cubrir" ? "llena la pantalla" : "completa");
      chip.classList.add("foto");
      chip.title = "Imagen";
      chip.style.background = "#000";
      VP.imagenes.url(v.imagen).then((u) => { if (u) chip.style.background = `#000 url("${u}")`; });
      return;
    }
    chip.classList.remove("foto");
    li.querySelector(".frag").textContent = v.texto.replace(/\n/g, " ").trim() || "Falta el texto";
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
      const otra = buscaLi(v.id);
      if (otra) otra.querySelector(".activo").focus();
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
    const mismaSeccion = () => { const a = lista.find((x) => x.id === arrastra); return a && esCancion(a) === esCancion(v); };
    li.addEventListener("dragover", (e) => {
      if (!arrastra || arrastra === v.id || !mismaSeccion()) return;
      e.preventDefault();
      limpiaMarcas();
      li.classList.add(despues(e) ? "marca-abajo" : "marca-arriba");
    });
    li.addEventListener("drop", (e) => {
      if (!arrastra || arrastra === v.id || !mismaSeccion()) return;
      e.preventDefault();
      mueve(arrastra, v.id, despues(e));
    });
    return li;
  }
  function limpiaMarcas() {
    document.querySelectorAll(".lado .marca-arriba,.lado .marca-abajo").forEach((n) => n.classList.remove("marca-arriba", "marca-abajo"));
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
    const li = buscaLi(v.id);
    if (li) rellenaItem(li, v);
    cuenta();
  }

  // ---------- Editor ----------
  let estrofaSel = 0;
  function selecciona(id) {
    sel = id;
    estrofaSel = 0;
    pintaLista();
    pintaEditor(true);
    const li = document.querySelector(".lado .item.sel");
    if (li) li.scrollIntoView({ block: "nearest" });
  }
  function pintaEditor(forzar) {
    const v = elegido();
    $("editor").hidden = !v;
    $("sinSeleccion").hidden = !!v;
    if (!v) return;
    const esImg = v.tipo === "imagen", esCan = esCancion(v), conPdf = esCan && v.paginas.length > 0;
    $("camposImagen").hidden = !esImg;
    $("camposVerso").hidden = esImg || esCan;
    $("camposCancion").hidden = !esCan;
    $("campoFondo").hidden = esImg || conPdf;
    $("fondoTodos").hidden = esImg;
    $("proyectar").lastChild.textContent = esCan ? " Proyectar esta estrofa" : " Proyectar este ahora";
    if (forzar) { avisa(""); }
    for (const b of elFondos.children) b.setAttribute("aria-checked", String(b.dataset.fondo === v.fondo));
    if (esCan) {
      if (forzar || document.activeElement !== $("tituloCancion")) $("tituloCancion").value = v.ref;
      if (forzar || document.activeElement !== $("letra")) $("letra").value = v.texto;
      $("mostrarTitulo").checked = v.verTitulo !== false;
      $("mostrarTitulo").parentElement.hidden = conPdf;
      $("campoLetra").hidden = conPdf;
      $("quitarPdf").hidden = !conPdf;
      $("campoPaginas").hidden = !conPdf;
      $("pdfContener").setAttribute("aria-pressed", String(v.ajuste !== "cubrir"));
      $("pdfCubrir").setAttribute("aria-pressed", String(v.ajuste === "cubrir"));
      pintaEstrofas();
    } else if (esImg) {
      if (forzar || document.activeElement !== $("nombreImg")) $("nombreImg").value = v.ref;
      $("ajContener").setAttribute("aria-pressed", String(v.ajuste !== "cubrir"));
      $("ajCubrir").setAttribute("aria-pressed", String(v.ajuste === "cubrir"));
    } else {
      if (forzar || document.activeElement !== inCita) inCita.value = v.ref;
      if (forzar || document.activeElement !== inTexto) inTexto.value = v.texto;
    }
    pintaPrevia();
  }

  // ---------- Canciones ----------
  const partesDe = (v) => (v.paginas.length ? v.paginas.map((p) => ({ imagen: p })) : VP.estrofas(v.texto).map((t) => ({ texto: t })));
  function pintaEstrofas() {
    const v = elegido(); if (!v || !esCancion(v)) return;
    const caja = $("estrofas");
    const partes = partesDe(v);
    if (estrofaSel >= partes.length) estrofaSel = Math.max(0, partes.length - 1);
    caja.innerHTML = "";
    if (!partes.length) { caja.innerHTML = '<p class="vacia">Cuando escribas la letra aparecerán aquí las estrofas.</p>'; return; }
    partes.forEach((p, k) => {
      const b = document.createElement("button");
      b.type = "button";
      const alAire = viva() && estado.id === v.id && estado.parte === k + 1;
      b.className = "estrofa" + (k === estrofaSel ? " sel" : "") + (alAire ? " aire" : "");
      const n = document.createElement("span");
      n.className = "n"; n.textContent = (p.imagen ? "Página " : "Estrofa ") + (k + 1);
      if (alAire) { const a = document.createElement("span"); a.className = "aire"; a.textContent = "EN PANTALLA"; n.appendChild(a); }
      b.appendChild(n);
      if (p.imagen) {
        const im = document.createElement("img"); im.alt = "";
        VP.imagenes.url(p.imagen).then((u) => { if (u) im.src = u; });
        b.appendChild(im);
      } else {
        const t = document.createElement("span"); t.className = "t"; t.textContent = p.texto;
        b.appendChild(t);
      }
      b.addEventListener("click", () => {
        estrofaSel = k;
        if (viva()) { if (v.activo === false) { v.activo = true; guarda(true); pintaLista(); } manda({ tipo: "ir", id: v.id, parte: k + 1 }); }
        pintaEstrofas(); pintaPrevia();
      });
      caja.appendChild(b);
    });
  }
  $("tituloCancion").addEventListener("input", () => { const v = elegido(); if (!v) return; v.ref = $("tituloCancion").value; actualizaItem(v); pintaPrevia(); guarda(); });
  $("letra").addEventListener("input", () => { const v = elegido(); if (!v) return; v.texto = $("letra").value; actualizaItem(v); pintaEstrofas(); pintaPrevia(); guarda(); });
  $("mostrarTitulo").addEventListener("change", () => { const v = elegido(); if (!v) return; v.verTitulo = $("mostrarTitulo").checked; guarda(true); pintaPrevia(); });
  $("pdfContener").addEventListener("click", () => ponAjuste("contener"));
  $("pdfCubrir").addEventListener("click", () => ponAjuste("cubrir"));
  $("quitarPdf").addEventListener("click", () => {
    const v = elegido(); if (!v) return;
    v.paginas = []; guarda(true); pintaEditor(true); actualizaItem(v); VP.imagenes.limpia(lista);
    $("letra").focus();
  });
  function nuevaCancion(datos) {
    return { id: nuevoId(), tipo: "cancion", ref: "", texto: "", fondo: "aurora", activo: true, imagen: "", ajuste: "contener", paginas: [], verTitulo: true, ...datos };
  }
  $("agregarCancion").addEventListener("click", () => {
    const it = nuevaCancion({});
    lista.push(it);
    guarda(true); selecciona(it.id);
    $("tituloCancion").focus();
  });
  $("subirCancion").addEventListener("click", () => $("archivoCancion").click());
  $("archivoCancion").addEventListener("change", async () => {
    const archivos = [...$("archivoCancion").files];
    $("archivoCancion").value = "";
    let ultimo = null, deUnPaquete = 0, repetidas = 0;
    // Repetida = mismo título y misma letra (si la letra cambia, es otra versión y se guarda)
    const claveDe = (c) => sinAcento(c.ref.trim()) + "|" + sinAcento(c.texto).replace(/[^a-z0-9ñ]+/g, "");
    const titulos = new Set(lista.filter(esCancion).map(claveDe));
    for (const f of archivos) {
      const r = await leeArchivoCancion(f);
      if (!r) continue;
      if (r.varias) {
        // De un paquete llegan apagadas: marcas solo las que vas a usar
        for (const c of r.varias) {
          const clave = claveDe(c);
          if (titulos.has(clave)) { repetidas++; continue; }
          titulos.add(clave);
          const it = nuevaCancion({ ...c, activo: false });
          lista.push(it); ultimo = ultimo || it; deUnPaquete++;
        }
        continue;
      }
      const it = nuevaCancion({ ref: sinExtension(f.name), ...r });
      lista.push(it); ultimo = it;
    }
    if (!ultimo) { if (repetidas) avisa(`Esas ${repetidas} canciones ya estaban en tu lista, con la misma letra.`, "ok"); return; }
    if (!guardaSeguro()) return;
    selecciona(ultimo.id);
    if (deUnPaquete) {
      avisa(`Se agregaron ${deUnPaquete} canciones${repetidas ? ` (${repetidas} no, porque estaban repetidas con la misma letra)` : ""}. Están sin marcar: márcalas o búscalas cuando las vayas a usar.`, "ok");
    } else avisa(archivos.length > 1 ? "Canciones agregadas. Revisa que las estrofas hayan quedado bien." : "Canción agregada. Revisa que las estrofas hayan quedado bien.", "ok");
  });
  // Guarda y avisa si el navegador ya no tiene espacio
  function guardaSeguro() {
    clearTimeout(reloj);
    if (VP.guardaLista(lista)) { guardado.textContent = "Guardado en este equipo"; guardado.classList.remove("error"); return true; }
    lista = VP.lista(); pintaLista(); pintaEditor(true);
    avisa("No hay espacio en este navegador para tantas canciones. Sube menos o borra algunas.", "error");
    return false;
  }
  $("subirLetra").addEventListener("click", () => $("archivoLetra").click());
  $("archivoLetra").addEventListener("change", async () => {
    const v = elegido(), f = $("archivoLetra").files[0];
    $("archivoLetra").value = "";
    if (!v || !f) return;
    const r = await leeArchivoCancion(f);
    if (!r) return;
    if (r.varias) return avisa("Ese es un paquete con varias canciones. Súbelo con el botón «Subir» de la sección Canciones.", "error");
    v.texto = r.texto || "";
    v.paginas = r.paginas || [];
    if (!v.ref.trim()) v.ref = sinExtension(f.name);
    estrofaSel = 0;
    guarda(true); pintaEditor(true); actualizaItem(v); VP.imagenes.limpia(lista);
    avisa("Listo. Revisa que las estrofas hayan quedado bien.", "ok");
  });

  // ---------- Leer archivos de letra o presentación ----------
  const cargas = {};
  const cargaScript = (src) => cargas[src] || (cargas[src] = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = src; s.onload = res;
    s.onerror = () => { delete cargas[src]; rej(new Error("sin conexión")); };
    document.head.appendChild(s);
  }));
  const JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const xml = (s) => new DOMParser().parseFromString(s, "application/xml");
  // Texto de un párrafo de Office: une los trozos y respeta los saltos de línea
  function textoParrafo(p, ns, t, br) {
    let s = "";
    const recorre = (n) => {
      for (const h of n.childNodes) {
        if (h.namespaceURI === ns && h.localName === t) s += h.textContent;
        else if (h.namespaceURI === ns && (h.localName === br || h.localName === "cr")) s += "\n";
        else if (h.namespaceURI === ns && h.localName === "tab") s += " ";
        else if (h.nodeType === 1) recorre(h);
      }
    };
    recorre(p);
    return s.replace(/[ \t]+/g, " ").trim();
  }
  const ordenaLetra = (t) => t.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  // Paquete de canciones de Quelea (.qsp): un zip con una canción en XML por archivo; cada <section> es una pantalla
  const ROTA = ["aurora", "estrellas", "amanecer", "rayos", "luces", "mar", "nebulosa", "luciernagas", "nubes"];
  const PISTAS = [
    [/milky|star|estrell|galax|space|espacio|night|noche|univers/i, "estrellas"],
    [/cloud|nube|sky|cielo/i, "nubes"],
    [/\bsea\b|ocean|\bmar\b|water|agua|wave|\bola|beach|falls/i, "mar"],
    [/sunrise|sunset|amanec|atardec|mountain|monta/i, "amanecer"],
    [/light|\bluz\b|\bray|rayo|cross|cruz/i, "rayos"],
    [/aurora/i, "aurora"],
    [/bokeh|particul|swirl|blur|abstract|fiber/i, "luces"],
    [/grass|pasto|campo|field/i, "luciernagas"],
    [/nebula|vine/i, "nebulosa"],
  ];
  async function leeQsp(f) {
    avisa("Abriendo el paquete de canciones…");
    await cargaScript(JSZIP);
    const zip = await window.JSZip.loadAsync(f);
    const archivos = Object.values(zip.files).filter((z) => !z.dir && /\.xml$/i.test(z.name));
    const canciones = [];
    for (const [k, z] of archivos.entries()) {
      if (k % 40 === 0) avisa(`Leyendo canciones… ${k} de ${archivos.length}`);
      const d = xml(await z.async("string"));
      if (d.getElementsByTagName("parsererror").length) continue;
      const cancion = d.getElementsByTagName("song")[0];
      if (!cancion) continue;
      const titulo = (cancion.getElementsByTagName("title")[0] || {}).textContent || sinExtension(z.name.split("/").pop());
      const secciones = [...cancion.getElementsByTagName("section")];
      const estrofas = secciones
        .map((s) => {
          const l = [...s.children].find((h) => h.tagName === "lyrics");
          return l ? l.textContent.replace(/\r/g, "").split("\n").map((x) => x.trim()).filter(Boolean).join("\n") : "";
        })
        .filter(Boolean);
      if (!estrofas.length) continue;
      const tema = (secciones[0] && secciones[0].getElementsByTagName("theme")[0] || {}).textContent || "";
      const fondoOriginal = (tema.match(/background(?:video|image):([^$]+)/) || [, ""])[1];
      const pista = PISTAS.find(([re]) => re.test(fondoOriginal) || re.test(titulo));
      canciones.push({ ref: titulo.trim(), texto: estrofas.join("\n\n"), fondo: pista ? pista[1] : ROTA[canciones.length % ROTA.length] });
    }
    if (!canciones.length) throw new Error("vacío");
    return { varias: canciones };
  }

  async function leeArchivoCancion(f) {
    const nombre = f.name.toLowerCase();
    try {
      if (nombre.endsWith(".qsp") || nombre.endsWith(".zip")) return await leeQsp(f);
      if (nombre.endsWith(".txt") || f.type === "text/plain") return { texto: ordenaLetra(await f.text()) };
      if (nombre.endsWith(".docx") || nombre.endsWith(".pptx")) {
        avisa("Leyendo el archivo…");
        await cargaScript(JSZIP);
        const zip = await window.JSZip.loadAsync(f);
        if (nombre.endsWith(".docx")) {
          const doc = xml(await zip.file("word/document.xml").async("string"));
          const ps = [...doc.getElementsByTagNameNS(NS_W, "p")].map((p) => textoParrafo(p, NS_W, "t", "br"));
          const texto = ordenaLetra(ps.join("\n"));
          if (!texto) throw new Error("vacío");
          return { texto };
        }
        // PowerPoint: cada diapositiva con texto es una estrofa
        const nombres = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
          .sort((a, b) => +a.match(/(\d+)\.xml$/)[1] - +b.match(/(\d+)\.xml$/)[1]);
        const estrofas = [];
        for (const n of nombres) {
          const d = xml(await zip.file(n).async("string"));
          const lineas = [...d.getElementsByTagNameNS(NS_A, "p")].map((p) => textoParrafo(p, NS_A, "t", "br")).filter(Boolean);
          if (lineas.length) estrofas.push(lineas.join("\n"));
        }
        if (!estrofas.length) throw new Error("vacío");
        return { texto: estrofas.join("\n\n") };
      }
      if (nombre.endsWith(".pdf") || f.type === "application/pdf") return await leePdf(f);
      if (/\.(ppt|doc|key|pages)$/.test(nombre)) {
        avisa("Ese formato es antiguo. Ábrelo y guárdalo como .pptx, .docx o PDF, y súbelo otra vez.", "error");
        return null;
      }
      avisa("Ese archivo no se puede leer. Usa .txt, Word (.docx), PowerPoint (.pptx) o PDF.", "error");
      return null;
    } catch (e) {
      avisa(e.message === "sin conexión"
        ? "Para leer Word, PowerPoint o PDF se necesita internet la primera vez. Revisa la conexión."
        : e.message === "vacío" ? "No encontré letra en ese archivo. Si es un PowerPoint con imágenes, guárdalo como PDF y súbelo." : "No pude leer ese archivo. Si es PowerPoint, prueba guardarlo como PDF.", "error");
      return null;
    }
  }
  // PDF: cada página se guarda como imagen para proyectarla tal como se ve
  async function leePdf(f) {
    await cargaScript(PDFJS);
    const lib = window.pdfjsLib;
    if (!lib.GlobalWorkerOptions.workerSrc) {
      try {
        const codigo = await (await fetch(PDFJS_WORKER)).text();
        lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([codigo], { type: "text/javascript" }));
      } catch (e) { throw new Error("sin conexión"); }
    }
    const pdf = await lib.getDocument({ data: await f.arrayBuffer() }).promise;
    if (pdf.numPages > 80) { avisa("Ese PDF tiene más de 80 páginas. Sube solo la canción.", "error"); return null; }
    const paginas = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      avisa(`Preparando página ${i} de ${pdf.numPages}…`);
      const pg = await pdf.getPage(i);
      const base = pg.getViewport({ scale: 1 });
      const vp = pg.getViewport({ scale: Math.min(3, 1920 / base.width) });
      const cv = document.createElement("canvas");
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      const c = cv.getContext("2d");
      c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height);
      // intent "print" evita depender de requestAnimationFrame (sigue aunque la pestaña quede atrás)
      await pg.render({ canvasContext: c, viewport: vp, intent: "print" }).promise;
      const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.9));
      paginas.push(await VP.imagenes.guarda(blob));
    }
    return { paginas, texto: "" };
  }
  $("nombreImg").addEventListener("input", () => { const v = elegido(); if (!v) return; v.ref = $("nombreImg").value; actualizaItem(v); guarda(); });
  function ponAjuste(a) { const v = elegido(); if (!v) return; v.ajuste = a; guarda(true); pintaEditor(); actualizaItem(v); }
  $("ajContener").addEventListener("click", () => ponAjuste("contener"));
  $("ajCubrir").addEventListener("click", () => ponAjuste("cubrir"));
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
  const pImagen = $("pImagen");
  function pintaPrevia() {
    const v = elegido(); if (!v) return;
    // Una canción se ve por estrofas (o páginas del PDF)
    let texto = v.texto, ref = v.ref, imagen = v.tipo === "imagen" ? v.imagen : "";
    if (esCancion(v)) {
      const p = partesDe(v)[estrofaSel] || {};
      imagen = p.imagen || "";
      texto = p.texto || "";
      ref = v.verTitulo === false ? "" : v.ref;
    }
    previa.classList.toggle("es-imagen", !!imagen);
    if (imagen) {
      pImagen.classList.toggle("cubrir", v.ajuste === "cubrir");
      VP.imagenes.url(imagen).then((u) => { if (elegido() === v) pImagen.src = u || ""; });
      return;
    }
    const f = FONDOS[v.fondo] ? v.fondo : "estrellas";
    if (escenaP.nombre !== f) preparaPrevia(f);
    pVerso.innerHTML = "";
    if (texto.trim()) {
      for (const l of texto.split("\n")) {
        const s = document.createElement("span");
        s.className = "linea"; s.textContent = l || " ";
        pVerso.appendChild(s);
      }
    } else pVerso.innerHTML = `<span class="linea fantasma">${esCancion(v) ? "Aquí aparecerá la letra" : "Aquí aparecerá el versículo"}</span>`;
    pCita.textContent = ref.trim();
    pCita.hidden = !ref.trim();
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
    if (escenaP.dibujar && !$("editor").hidden && !previa.classList.contains("es-imagen")) escenaP.dibujar(ctxP, (ahora - escenaP.t0) / 1000);
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
  function avisa(txt, tipo) {
    for (const el of [aviso, $("avisoImg"), $("avisoCancion")]) { el.textContent = txt; el.className = "aviso" + (tipo ? " " + tipo : ""); }
  }

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
    const nuevo = { id: nuevoId(), tipo: "verso", ref: "", texto: "", fondo: actual && actual.tipo !== "imagen" ? actual.fondo : "estrellas", activo: true, imagen: "", ajuste: "contener" };
    const i = actual ? lista.indexOf(actual) + 1 : lista.length;
    lista.splice(i, 0, nuevo);
    guarda(true);
    selecciona(nuevo.id);
    inCita.focus();
    avisa("Escribe la cita y toca «Traer el texto de la Biblia», o escribe el texto a mano.");
  });
  // ---------- Imágenes ----------
  // Achica fotos muy grandes (más de 2560 px) para que carguen rápido; GIF y SVG se guardan tal cual
  async function preparaImagen(file) {
    if (/gif|svg/.test(file.type)) return file;
    let bmp;
    try { bmp = await createImageBitmap(file); } catch (e) { return null; }
    const k = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.size < 4e6) { bmp.close && bmp.close(); return file; }
    const cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    bmp.close && bmp.close();
    const tipo = file.type === "image/png" ? "image/png" : "image/jpeg";
    return new Promise((r) => cv.toBlob((b) => r(b || file), tipo, 0.9));
  }
  const sinExtension = (n) => n.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
  async function agregaImagenes(archivos) {
    const fotos = [...archivos].filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name));
    if (!fotos.length) return avisa("Ese archivo no es una imagen. Usa JPG, PNG, WebP o GIF.", "error");
    avisa(fotos.length > 1 ? `Cargando ${fotos.length} imágenes…` : "Cargando la imagen…");
    let pos = elegido() ? lista.indexOf(elegido()) + 1 : lista.length, ultimo = null, fallidas = 0;
    for (const f of fotos) {
      const blob = await preparaImagen(f);
      if (!blob) { fallidas++; continue; }
      try {
        const imagen = await VP.imagenes.guarda(blob);
        const it = { id: nuevoId(), tipo: "imagen", ref: sinExtension(f.name), texto: "", fondo: "estrellas", activo: true, imagen, ajuste: "contener" };
        lista.splice(pos++, 0, it);
        ultimo = it;
      } catch (e) { fallidas++; }
    }
    if (ultimo) { guarda(true); selecciona(ultimo.id); }
    if (fallidas) avisa(`${fallidas === fotos.length ? "No se pudo" : `No se pudieron ${fallidas} de ${fotos.length}`}: ese formato no se puede abrir (las fotos HEIC de iPhone, por ejemplo). Pídela en JPG o PNG.`, "error");
    else avisa(fotos.length > 1 ? `Se agregaron ${fotos.length} imágenes.` : "Imagen agregada. Ya puedes proyectarla.", "ok");
  }
  $("agregarImg").addEventListener("click", () => $("archivoImg").click());
  $("archivoImg").addEventListener("change", async () => { await agregaImagenes($("archivoImg").files); $("archivoImg").value = ""; });
  $("cambiarImg").addEventListener("click", () => $("archivoCambio").click());
  $("archivoCambio").addEventListener("change", async () => {
    const v = elegido(), f = $("archivoCambio").files[0];
    $("archivoCambio").value = "";
    if (!v || !f) return;
    const blob = await preparaImagen(f);
    if (!blob) return avisa("Ese formato no se puede abrir. Pídela en JPG o PNG.", "error");
    v.imagen = await VP.imagenes.guarda(blob);
    guarda(true); pintaEditor(); actualizaItem(v);
    VP.imagenes.limpia(lista);
    avisa("Imagen cambiada.", "ok");
  });
  // Arrastrar archivos de imagen sobre el panel
  const traeArchivos = (e) => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  let salida;
  addEventListener("dragover", (e) => {
    if (!traeArchivos(e)) return;
    e.preventDefault();
    document.body.classList.add("soltando");
    clearTimeout(salida);
    salida = setTimeout(() => document.body.classList.remove("soltando"), 300);
  });
  addEventListener("drop", (e) => {
    if (!traeArchivos(e)) return;
    e.preventDefault();
    document.body.classList.remove("soltando");
    agregaImagenes(e.dataTransfer.files);
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
    if (v.tipo !== "verso") VP.imagenes.limpia(lista);
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
    VP.imagenes.limpia(lista);
  });

  // Copia en archivo
  const aTexto = (blob) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => r(null); fr.readAsDataURL(blob); });
  $("exportar").addEventListener("click", async () => {
    // Las imágenes van dentro del archivo para que la copia sirva en otra computadora
    const copia = [];
    for (const v of lista) {
      const lee = async (id) => { const b = await VP.imagenes.lee(id).catch(() => null); return b ? aTexto(b) : null; };
      if (v.tipo === "imagen") copia.push({ ...v, imagenData: (await lee(v.imagen)) || undefined });
      else if (v.paginas && v.paginas.length) {
        const datos = [];
        for (const p of v.paginas) datos.push(await lee(p));
        copia.push({ ...v, paginasData: datos });
      } else copia.push(v);
    }
    const blob = new Blob([JSON.stringify({ versiculos: copia }, null, 2)], { type: "application/json" });
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
      for (const v of l) {
        if (v.tipo === "imagen" && v.imagenData) {
          try { v.imagen = await VP.imagenes.guarda(await (await fetch(v.imagenData)).blob()); } catch (e) { v.imagen = ""; }
        }
        if (Array.isArray(v.paginasData)) {
          const ids = [];
          for (const d of v.paginasData) {
            if (!d) continue;
            try { ids.push(await VP.imagenes.guarda(await (await fetch(d)).blob())); } catch (e) {}
          }
          v.paginas = ids;
        }
        delete v.imagenData;
        delete v.paginasData;
      }
      lista = l; sel = lista[0].id;
      guarda(true); pintaLista(); pintaEditor(true);
      VP.imagenes.limpia(lista);
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
  $("marcarTodos").addEventListener("click", () => { for (const v of lista) if (!esCancion(v)) v.activo = true; guarda(true); pintaLista(); });
  $("desmarcarTodos").addEventListener("click", () => {
    for (const v of lista) if (!esCancion(v)) v.activo = false;
    guarda(true); pintaLista();
    avisa("Ahora marca solo los versículos que vas a usar.");
  });
  $("quitarCanciones").addEventListener("click", () => { for (const v of lista) if (esCancion(v)) v.activo = false; guarda(true); pintaLista(); });
  $("soloMarcadas").addEventListener("click", () => {
    soloMarcadas = !soloMarcadas;
    $("soloMarcadas").setAttribute("aria-pressed", String(soloMarcadas));
    pintaLista();
  });
  let relojBusca;
  $("buscarCancion").addEventListener("input", () => {
    clearTimeout(relojBusca);
    relojBusca = setTimeout(() => { filtro = normal($("buscarCancion").value.trim()); pintaLista(); }, 150);
  });

  // ---------- Control de la proyección ----------
  const manda = (m) => VP.canal && VP.canal.postMessage(m);
  const viva = () => Date.now() - ultimoEstado < 2500;
  function abreProyeccion(inicio, parte) {
    const url = "./" + (inicio ? "?inicio=" + encodeURIComponent(inicio) + (parte > 1 ? "&parte=" + parte : "") : "");
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
    if (!VP.tieneContenido(v)) return avisa(esCancion(v) ? "Primero escribe la letra de la canción." : "Primero escribe el texto del versículo.", "error");
    if (v.activo === false) { v.activo = true; pintaLista(); }
    guarda(true);
    const parte = esCancion(v) ? estrofaSel + 1 : 1;
    if (viva()) manda({ tipo: "ir", id: v.id, parte });
    else abreProyeccion(v.id, parte);
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
    const nombre = (x) => x.ref || (x.tipo === "imagen" ? "imagen" : "sin título");
    let t = v ? `En pantalla: ${nombre(v)}` : "Proyección abierta";
    if (v && estado.partes > 1) t += ` (${estado.parte} de ${estado.partes})`;
    if (estado.negro) t = "Pantalla en negro · " + t;
    if (estado.manual && s) t += s === v ? ` · sigue: ${v.paginas && v.paginas.length ? "página" : "estrofa"} ${estado.sigParte}` : ` · sigue: ${nombre(s)}`;
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
      const parteAntes = estado.parte, idAntes = estado.id;
      estado = m; ultimoEstado = Date.now();
      if (enPantalla !== m.id || sigPantalla !== m.sigId) { enPantalla = m.id; sigPantalla = m.sigId; pintaLista(); }
      if ((parteAntes !== m.parte || idAntes !== m.id) && elegido() && esCancion(elegido())) {
        // sigue la estrofa en pantalla si estás viendo esa canción
        if (m.id === sel) estrofaSel = Math.max(0, m.parte - 1);
        pintaEstrofas(); pintaPrevia();
      }
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

  // Copia para usar sin internet (la página, sus archivos y las librerías de lectura)
  if ("serviceWorker" in navigator && window.isSecureContext) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
