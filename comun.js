// Lista de diapositivas compartida entre el panel y la proyección (se guarda en este navegador).
// Cada diapositiva es un versículo (tipo "verso") o una imagen (tipo "imagen", guardada en IndexedDB).
(function () {
  const CLAVE = "vp-lista";
  const CLAVE_FONDOS = "vp-fondos";

  // Fondos propios (imagen o video subidos): su id empieza con "f-" y el archivo vive en IndexedDB
  const esPropio = (f) => typeof f === "string" && f.startsWith("f-");
  function fondosPropios() {
    try {
      const l = JSON.parse(localStorage.getItem(CLAVE_FONDOS));
      if (Array.isArray(l)) {
        return l.filter((f) => f && f.id && f.blob).map((f) => ({
          id: String(f.id), nombre: String(f.nombre || "Fondo"), tipo: f.tipo === "video" ? "video" : "imagen", blob: String(f.blob), mini: String(f.mini || ""),
        }));
      }
    } catch (e) {}
    return [];
  }
  function guardaFondos(l) {
    try { localStorage.setItem(CLAVE_FONDOS, JSON.stringify(l)); return true; } catch (e) { return false; }
  }

  function porDefecto() {
    return (window.VERSICULOS || []).map((v, i) => ({ id: "v" + i, tipo: "verso", ref: v.ref, texto: v.texto, fondo: v.fondo, activo: true, imagen: "", ajuste: "contener" }));
  }
  function limpia(l) {
    return l
      .filter((v) => v && typeof v === "object")
      .map((v, i) => ({
        id: String(v.id || "i" + Date.now().toString(36) + i),
        tipo: v.tipo === "imagen" || v.tipo === "cancion" ? v.tipo : "verso",
        paginas: Array.isArray(v.paginas) ? v.paginas.filter(Boolean).map(String) : [],
        ...(Array.isArray(v.paginasData) ? { paginasData: v.paginasData } : {}),
        ref: String(v.ref || ""),
        texto: String(v.texto || ""),
        fondo: (window.FONDOS && window.FONDOS[v.fondo]) || esPropio(v.fondo) ? v.fondo : "estrellas",
        video: !!v.video,
        sonido: !!v.sonido,
        activo: v.activo !== false,
        imagen: v.imagen ? String(v.imagen) : "",
        ajuste: v.ajuste === "cubrir" ? "cubrir" : "contener",
        verTitulo: v.verTitulo !== false,
        ...(v.imagenData ? { imagenData: String(v.imagenData) } : {}),
      }));
  }
  const tieneContenido = (v) =>
    v.tipo === "imagen" ? !!v.imagen : v.tipo === "cancion" ? !!(v.texto.trim() || v.paginas.length) : !!v.texto.trim();

  // Una línea en blanco separa las estrofas: cada estrofa es una diapositiva
  const estrofas = (texto) => texto.replace(/\r/g, "").split(/\n[ \t]*\n+/).map((e) => e.replace(/^\s+|\s+$/g, "")).filter(Boolean);

  // Orden de proyección: primero versículos e imágenes, luego las canciones
  const ordenados = (l) => [...l.filter((v) => v.tipo !== "cancion"), ...l.filter((v) => v.tipo === "cancion")];

  // Convierte la lista en diapositivas (una canción se vuelve varias)
  function diapositivas(l) {
    const out = [];
    for (const v of ordenados(l)) {
      if (v.activo === false || !tieneContenido(v)) continue;
      if (v.tipo !== "cancion") { out.push({ ...v, item: v.id, parte: 1, partes: 1 }); continue; }
      if (v.paginas.length) {
        v.paginas.forEach((p, k) => out.push({ id: v.id + "#" + k, item: v.id, tipo: "imagen", imagen: p, ajuste: v.ajuste, ref: v.ref, texto: "", fondo: v.fondo, parte: k + 1, partes: v.paginas.length, cancion: true }));
      } else {
        const es = estrofas(v.texto);
        es.forEach((e, k) => out.push({ id: v.id + "#" + k, item: v.id, tipo: "verso", texto: e, ref: v.verTitulo === false ? "" : v.ref, fondo: v.fondo, parte: k + 1, partes: es.length, cancion: true }));
      }
    }
    return out;
  }
  function lista() {
    try {
      const l = JSON.parse(localStorage.getItem(CLAVE));
      if (Array.isArray(l)) return limpia(l);
    } catch (e) {}
    return porDefecto();
  }
  function guardaLista(l) {
    try { localStorage.setItem(CLAVE, JSON.stringify(l)); return true; } catch (e) { return false; }
  }
  function leer(k) { try { return localStorage.getItem("vp-" + k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem("vp-" + k, v); } catch (e) {} }

  // ---------- Imágenes en IndexedDB ----------
  let dbP = null;
  function db() {
    if (!dbP) {
      dbP = new Promise((res, rej) => {
        const r = indexedDB.open("vp", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("imagenes");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    return dbP;
  }
  async function tx(modo, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction("imagenes", modo);
      const pedido = fn(t.objectStore("imagenes"));
      t.oncomplete = () => res(pedido ? pedido.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }
  const urls = {};
  const imagenes = {
    async guarda(blob) {
      const id = "img" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      await tx("readwrite", (st) => st.put(blob, id));
      return id;
    },
    lee: (id) => tx("readonly", (st) => st.get(id)),
    async borra(id) {
      if (urls[id]) { URL.revokeObjectURL(urls[id]); delete urls[id]; }
      await tx("readwrite", (st) => st.delete(id));
    },
    claves: () => tx("readonly", (st) => st.getAllKeys()),
    async url(id) {
      if (!id) return null;
      if (urls[id]) return urls[id];
      try {
        const b = await imagenes.lee(id);
        if (!b) return null;
        return (urls[id] = URL.createObjectURL(b));
      } catch (e) { return null; }
    },
    // Borra las imágenes que ya ninguna diapositiva usa
    async limpia(l) {
      try {
        const usadas = new Set();
        for (const v of l) { if (v.imagen) usadas.add(v.imagen); for (const p of v.paginas || []) usadas.add(p); }
        for (const f of fondosPropios()) usadas.add(f.blob);
        for (const k of await imagenes.claves()) if (!usadas.has(k)) await imagenes.borra(k);
      } catch (e) {}
    },
  };

  let canal = null;
  try { canal = new BroadcastChannel("vp"); } catch (e) {}

  window.VP = { CLAVE, CLAVE_FONDOS, esPropio, fondosPropios, guardaFondos, porDefecto, limpia, lista, guardaLista, leer, guardar, canal, tieneContenido, estrofas, ordenados, diapositivas, imagenes };
})();
