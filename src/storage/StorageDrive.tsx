// src/storage/StorageDrive.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  deleteObject,
  getBytes,
  getDownloadURL,
  getMetadata,
  listAll,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";

import { storage } from "../firebase/config";

import type {
  StorageDriveProps,
  StorageItem,
  StorageViewMode,
} from "./storageTypes";

import "./StorageDrive.css";

/* =========================================================
   UTILIDADES
========================================================= */

const formatearBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null) {
    return "—";
  }

  if (bytes === 0) {
    return "0 B";
  }

  const unidades = ["B", "KB", "MB", "GB", "TB"];

  const indice = Math.floor(Math.log(bytes) / Math.log(1024));

  const valor = bytes / Math.pow(1024, indice);

  return `${valor.toFixed(indice === 0 ? 0 : 2)} ${unidades[indice]}`;
};

const formatearFecha = (fecha?: string) => {
  if (!fecha) {
    return "—";
  }

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return fecha;
  }

  return date.toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const esImagen = (item: StorageItem) => {
  if (item.contentType?.startsWith("image/")) {
    return true;
  }

  return /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i.test(item.name);
};

const esPdf = (item: StorageItem) => {
  return item.contentType === "application/pdf" || /\.pdf$/i.test(item.name);
};

const unirRuta = (ruta: string, nombre: string) => {
  if (!ruta) {
    return nombre;
  }

  return `${ruta}/${nombre}`;
};

const obtenerNombrePadre = (ruta: string) => {
  const partes = ruta.split("/").filter(Boolean);

  partes.pop();

  return partes.join("/");
};

/* =========================================================
   COMPONENTE
========================================================= */

const StorageDrive: React.FC<StorageDriveProps> = ({
  initialPath = "",
  selectorMode = false,
  onlyImages = false,
  onSelectFile,
}) => {
  /* =====================================================
       ESTADOS
    ===================================================== */

  const [rutaActual, setRutaActual] = useState(initialPath);

  const [items, setItems] = useState<StorageItem[]>([]);

  const [cargando, setCargando] = useState(false);

  const [error, setError] = useState("");

  const [vista, setVista] = useState<StorageViewMode>("list");

  const [busqueda, setBusqueda] = useState("");

  const [archivoPreview, setArchivoPreview] = useState<StorageItem | null>(
    null
  );

  const [subiendo, setSubiendo] = useState(false);

  const [progresoTexto, setProgresoTexto] = useState("");

  const inputArchivoRef = useRef<HTMLInputElement | null>(null);

  /* =====================================================
       CARGAR CARPETA
    ===================================================== */

  const cargarRuta = useCallback(async (ruta: string) => {
    try {
      setCargando(true);

      setError("");

      const referencia = storageRef(storage, ruta);

      const resultado = await listAll(referencia);

      const carpetas: StorageItem[] = resultado.prefixes.map((carpeta) => ({
        name: carpeta.name,

        fullPath: carpeta.fullPath,

        type: "folder",
      }));

      const archivos = await Promise.all(
        resultado.items.map(async (archivo): Promise<StorageItem | null> => {
          /*
                                        .keep existe solamente
                                        para mantener carpetas vacías.
                                        No lo mostramos.
                                    */

          if (archivo.name === ".keep") {
            return null;
          }

          try {
            const [metadata, url] = await Promise.all([
              getMetadata(archivo),

              getDownloadURL(archivo),
            ]);

            return {
              name: archivo.name,

              fullPath: archivo.fullPath,

              type: "file",

              url,

              contentType: metadata.contentType,

              size: metadata.size,

              timeCreated: metadata.timeCreated,

              updated: metadata.updated,
            };
          } catch (error) {
            console.error("Error leyendo archivo:", archivo.fullPath, error);

            return {
              name: archivo.name,

              fullPath: archivo.fullPath,

              type: "file",
            };
          }
        })
      );

      const archivosValidos = archivos.filter(
        (item): item is StorageItem => item !== null
      );

      carpetas.sort((a, b) => a.name.localeCompare(b.name));

      archivosValidos.sort((a, b) => a.name.localeCompare(b.name));

      setItems([...carpetas, ...archivosValidos]);

      setRutaActual(ruta);

      setBusqueda("");
    } catch (error) {
      console.error("Error leyendo Storage:", error);

      setError("No se pudo cargar esta carpeta de Storage.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarRuta(initialPath);
  }, [initialPath, cargarRuta]);

  /* =====================================================
       ITEMS FILTRADOS
    ===================================================== */

  const itemsFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return items.filter((item) => {
      if (onlyImages && item.type === "file" && !esImagen(item)) {
        return false;
      }

      if (!texto) {
        return true;
      }

      return item.name.toLowerCase().includes(texto);
    });
  }, [items, busqueda, onlyImages]);

  /* =====================================================
       NAVEGACIÓN
    ===================================================== */

  const abrirCarpeta = (carpeta: StorageItem) => {
    if (carpeta.type !== "folder") {
      return;
    }

    cargarRuta(carpeta.fullPath);
  };

  const subirNivel = () => {
    if (!rutaActual) {
      return;
    }

    cargarRuta(obtenerNombrePadre(rutaActual));
  };

  /* =====================================================
       BREADCRUMBS
    ===================================================== */

  const breadcrumbs = useMemo(() => {
    const partes = rutaActual.split("/").filter(Boolean);

    return partes.map((parte, index) => {
      const ruta = partes.slice(0, index + 1).join("/");

      return {
        nombre: parte,

        ruta,
      };
    });
  }, [rutaActual]);

  /* =====================================================
       CREAR CARPETA
    ===================================================== */

  const crearCarpeta = async () => {
    const nombre = window.prompt("Nombre de la nueva carpeta:");

    if (!nombre || !nombre.trim()) {
      return;
    }

    const nombreLimpio = nombre.trim().replace(/[\\/]/g, "-");

    try {
      const rutaCarpeta = unirRuta(rutaActual, nombreLimpio);

      /*
                    Firebase Storage no tiene
                    carpetas reales.

                    Creamos un archivo .keep para
                    mantener visible una carpeta vacía.
                */

      const marcador = storageRef(storage, `${rutaCarpeta}/.keep`);

      await uploadBytes(
        marcador,
        new Blob([""], {
          type: "text/plain",
        })
      );

      await cargarRuta(rutaActual);
    } catch (error) {
      console.error("Error creando carpeta:", error);

      alert("No se pudo crear la carpeta.");
    }
  };

  /* =====================================================
       SUBIR ARCHIVOS
    ===================================================== */

  const seleccionarArchivos = () => {
    inputArchivoRef.current?.click();
  };

  const subirArchivos = async (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) {
      return;
    }

    try {
      setSubiendo(true);

      for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];

        setProgresoTexto(
          `Subiendo ${i + 1} de ${archivos.length}: ${archivo.name}`
        );

        const ruta = unirRuta(rutaActual, archivo.name);

        await uploadBytes(storageRef(storage, ruta), archivo, {
          contentType: archivo.type || undefined,
        });
      }

      await cargarRuta(rutaActual);
    } catch (error) {
      console.error("Error subiendo archivos:", error);

      alert("No se pudieron subir todos los archivos.");
    } finally {
      setSubiendo(false);

      setProgresoTexto("");

      if (inputArchivoRef.current) {
        inputArchivoRef.current.value = "";
      }
    }
  };

  /* =====================================================
       DESCARGAR
    ===================================================== */

  const descargarArchivo = async (item: StorageItem) => {
    if (item.type !== "file") {
      return;
    }

    try {
      const bytes = await getBytes(storageRef(storage, item.fullPath));

      const blob = new Blob([bytes]);

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = item.name;

      document.body.appendChild(a);

      a.click();

      a.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando archivo:", error);

      alert("No se pudo descargar el archivo.");
    }
  };

  /* =====================================================
       ELIMINAR ARCHIVO
    ===================================================== */

  const eliminarArchivo = async (item: StorageItem) => {
    if (item.type !== "file") {
      return;
    }

    if (!window.confirm(`¿Eliminar "${item.name}" definitivamente?`)) {
      return;
    }

    try {
      await deleteObject(storageRef(storage, item.fullPath));

      if (archivoPreview?.fullPath === item.fullPath) {
        setArchivoPreview(null);
      }

      await cargarRuta(rutaActual);
    } catch (error) {
      console.error("Error eliminando archivo:", error);

      alert("No se pudo eliminar el archivo.");
    }
  };

  /* =====================================================
       ELIMINAR CARPETA RECURSIVAMENTE
    ===================================================== */

  const borrarContenidoCarpeta = async (ruta: string) => {
    const referencia = storageRef(storage, ruta);

    const resultado = await listAll(referencia);

    for (const archivo of resultado.items) {
      await deleteObject(archivo);
    }

    for (const carpeta of resultado.prefixes) {
      await borrarContenidoCarpeta(carpeta.fullPath);
    }
  };

  const eliminarCarpeta = async (item: StorageItem) => {
    if (item.type !== "folder") {
      return;
    }

    if (
      !window.confirm(
        `¿Eliminar la carpeta "${item.name}" y TODO su contenido?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      setCargando(true);

      await borrarContenidoCarpeta(item.fullPath);

      await cargarRuta(rutaActual);
    } catch (error) {
      console.error("Error eliminando carpeta:", error);

      alert("No se pudo eliminar completamente la carpeta.");
    } finally {
      setCargando(false);
    }
  };

  /* =====================================================
       RENOMBRAR ARCHIVO

       Storage no tiene rename:
       1. obtenemos bytes
       2. subimos nuevo
       3. borramos anterior
    ===================================================== */

  const renombrarArchivo = async (item: StorageItem) => {
    if (item.type !== "file") {
      return;
    }

    const nuevoNombre = window.prompt("Nuevo nombre del archivo:", item.name);

    if (
      !nuevoNombre ||
      !nuevoNombre.trim() ||
      nuevoNombre.trim() === item.name
    ) {
      return;
    }

    const nombreLimpio = nuevoNombre.trim().replace(/[\\/]/g, "-");

    try {
      setCargando(true);

      const referenciaAnterior = storageRef(storage, item.fullPath);

      const metadata = await getMetadata(referenciaAnterior);

      const bytes = await getBytes(referenciaAnterior);

      const nuevaRuta = unirRuta(rutaActual, nombreLimpio);

      const referenciaNueva = storageRef(storage, nuevaRuta);

      await uploadBytes(referenciaNueva, bytes, {
        contentType: metadata.contentType,
      });

      await deleteObject(referenciaAnterior);

      setArchivoPreview(null);

      await cargarRuta(rutaActual);
    } catch (error) {
      console.error("Error renombrando archivo:", error);

      alert("No se pudo renombrar el archivo.");
    } finally {
      setCargando(false);
    }
  };

  /* =====================================================
       COPIAR RUTA
    ===================================================== */

  const copiarRuta = async (item: StorageItem) => {
    try {
      await navigator.clipboard.writeText(item.fullPath);

      alert("Ruta copiada.");
    } catch {
      window.prompt("Copia la ruta:", item.fullPath);
    }
  };

  /* =====================================================
       DOBLE CLICK
    ===================================================== */

  const dobleClickItem = (item: StorageItem) => {
    if (item.type === "folder") {
      abrirCarpeta(item);

      return;
    }

    if (selectorMode && onSelectFile) {
      onSelectFile(item);

      return;
    }

    setArchivoPreview(item);
  };

  /* =====================================================
       RENDER LISTA
    ===================================================== */

  const renderLista = () => (
    <div className="storage-tabla-wrapper">
      <table className="storage-tabla">
        <thead>
          <tr>
            <th>Nombre</th>

            <th>Tipo</th>

            <th>Tamaño</th>

            <th>Modificado</th>

            <th className="storage-col-acciones">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {itemsFiltrados.map((item) => (
            <tr key={item.fullPath} onDoubleClick={() => dobleClickItem(item)}>
              <td>
                <button
                  type="button"
                  className="storage-nombre-btn"
                  onClick={() => {
                    if (item.type === "folder") {
                      abrirCarpeta(item);
                    } else {
                      setArchivoPreview(item);
                    }
                  }}
                >
                  <span className="storage-item-icon">
                    {item.type === "folder"
                      ? "📁"
                      : esImagen(item)
                      ? "🖼️"
                      : esPdf(item)
                      ? "📕"
                      : "📄"}
                  </span>

                  <span>{item.name}</span>
                </button>
              </td>

              <td>
                {item.type === "folder"
                  ? "Carpeta"
                  : item.contentType || "Archivo"}
              </td>

              <td>
                {item.type === "folder" ? "—" : formatearBytes(item.size)}
              </td>

              <td>
                {item.type === "folder" ? "—" : formatearFecha(item.updated)}
              </td>

              <td>
                <div className="storage-acciones">
                  {item.type === "folder" ? (
                    <>
                      <button
                        type="button"
                        title="Abrir"
                        onClick={() => abrirCarpeta(item)}
                      >
                        📂
                      </button>

                      <button
                        type="button"
                        title="Copiar ruta"
                        onClick={() => copiarRuta(item)}
                      >
                        📋
                      </button>

                      <button
                        type="button"
                        title="Eliminar carpeta"
                        className="storage-accion-danger"
                        onClick={() => eliminarCarpeta(item)}
                      >
                        🗑️
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        title="Vista previa"
                        onClick={() => setArchivoPreview(item)}
                      >
                        👁️
                      </button>

                      {selectorMode && onSelectFile && (
                        <button
                          type="button"
                          title="Seleccionar"
                          className="storage-accion-select"
                          onClick={() => onSelectFile(item)}
                        >
                          ✓
                        </button>
                      )}

                      <button
                        type="button"
                        title="Descargar"
                        onClick={() => descargarArchivo(item)}
                      >
                        ⬇️
                      </button>

                      <button
                        type="button"
                        title="Renombrar"
                        onClick={() => renombrarArchivo(item)}
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        title="Copiar ruta"
                        onClick={() => copiarRuta(item)}
                      >
                        📋
                      </button>

                      <button
                        type="button"
                        title="Eliminar"
                        className="storage-accion-danger"
                        onClick={() => eliminarArchivo(item)}
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  /* =====================================================
       RENDER CUADRÍCULA
    ===================================================== */

  const renderGrid = () => (
    <div className="storage-grid">
      {itemsFiltrados.map((item) => (
        <div
          key={item.fullPath}
          className="storage-grid-card"
          onDoubleClick={() => dobleClickItem(item)}
        >
          <button
            type="button"
            className="storage-grid-preview"
            onClick={() => {
              if (item.type === "folder") {
                abrirCarpeta(item);
              } else {
                setArchivoPreview(item);
              }
            }}
          >
            {item.type === "folder" ? (
              <span className="storage-folder-grande">📁</span>
            ) : esImagen(item) && item.url ? (
              <img src={item.url} alt={item.name} />
            ) : esPdf(item) ? (
              <span className="storage-archivo-grande">📕</span>
            ) : (
              <span className="storage-archivo-grande">📄</span>
            )}
          </button>

          <div className="storage-grid-info">
            <strong title={item.name}>{item.name}</strong>

            <small>
              {item.type === "folder" ? "Carpeta" : formatearBytes(item.size)}
            </small>
          </div>

          <div className="storage-grid-acciones">
            {item.type === "folder" ? (
              <>
                <button
                  type="button"
                  title="Abrir"
                  onClick={() => abrirCarpeta(item)}
                >
                  📂
                </button>

                <button
                  type="button"
                  title="Eliminar"
                  className="storage-accion-danger"
                  onClick={() => eliminarCarpeta(item)}
                >
                  🗑️
                </button>
              </>
            ) : (
              <>
                {selectorMode && onSelectFile && (
                  <button
                    type="button"
                    title="Seleccionar"
                    className="storage-accion-select"
                    onClick={() => onSelectFile(item)}
                  >
                    ✓
                  </button>
                )}

                <button
                  type="button"
                  title="Descargar"
                  onClick={() => descargarArchivo(item)}
                >
                  ⬇️
                </button>

                <button
                  type="button"
                  title="Eliminar"
                  className="storage-accion-danger"
                  onClick={() => eliminarArchivo(item)}
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  /* =====================================================
       RENDER PRINCIPAL
    ===================================================== */

  return (
    <div className="storage-drive">
      {/* =================================================
                HEADER
            ================================================= */}

      <div className="storage-header">
        <div>
          <h2>☁️ Firebase Storage</h2>

          <p>Administrador de archivos y carpetas</p>
        </div>

        <div className="storage-vista-selector">
          <button
            type="button"
            className={vista === "list" ? "activo" : ""}
            onClick={() => setVista("list")}
            title="Vista lista"
          >
            ☷
          </button>

          <button
            type="button"
            className={vista === "grid" ? "activo" : ""}
            onClick={() => setVista("grid")}
            title="Vista cuadrícula"
          >
            ▦
          </button>
        </div>
      </div>

      {/* =================================================
                BARRA DE HERRAMIENTAS
            ================================================= */}

      <div className="storage-toolbar">
        <button type="button" onClick={subirNivel} disabled={!rutaActual}>
          ⬆ Subir nivel
        </button>

        <button type="button" onClick={crearCarpeta}>
          📁 + Carpeta
        </button>

        <button type="button" onClick={seleccionarArchivos} disabled={subiendo}>
          ⬆ Subir archivos
        </button>

        <button
          type="button"
          onClick={() => cargarRuta(rutaActual)}
          disabled={cargando}
        >
          🔄 Actualizar
        </button>

        <input
          ref={inputArchivoRef}
          type="file"
          multiple
          hidden
          onChange={(e) => subirArchivos(e.target.files)}
        />
      </div>

      {/* =================================================
                BREADCRUMBS
            ================================================= */}

      <div className="storage-breadcrumbs">
        <button type="button" onClick={() => cargarRuta("")}>
          Storage
        </button>

        {breadcrumbs.map((item) => (
          <React.Fragment key={item.ruta}>
            <span>›</span>

            <button type="button" onClick={() => cargarRuta(item.ruta)}>
              {item.nombre}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* =================================================
                BUSCADOR
            ================================================= */}

      <div className="storage-search">
        <span>🔎</span>

        <input
          type="text"
          value={busqueda}
          placeholder="Buscar en esta carpeta..."
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* =================================================
                ESTADO
            ================================================= */}

      {subiendo && (
        <div className="storage-mensaje storage-mensaje-info">
          {progresoTexto}
        </div>
      )}

      {error && (
        <div className="storage-mensaje storage-mensaje-error">{error}</div>
      )}

      {/* =================================================
                CONTENIDO
            ================================================= */}

      <div className="storage-contenido">
        {cargando ? (
          <div className="storage-cargando">
            <div className="storage-spinner" />

            <span>Cargando Storage...</span>
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="storage-vacio">
            <span>📂</span>

            <strong>Esta carpeta está vacía</strong>

            <small>Puedes crear una carpeta o subir archivos.</small>
          </div>
        ) : vista === "list" ? (
          renderLista()
        ) : (
          renderGrid()
        )}
      </div>

      {/* =================================================
                PREVIEW
            ================================================= */}

      {archivoPreview && (
        <div
          className="storage-preview-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setArchivoPreview(null);
            }
          }}
        >
          <div className="storage-preview-modal">
            <div className="storage-preview-header">
              <div>
                <small>ARCHIVO</small>

                <h3>{archivoPreview.name}</h3>
              </div>

              <button type="button" onClick={() => setArchivoPreview(null)}>
                ✕
              </button>
            </div>

            <div className="storage-preview-body">
              <div className="storage-preview-visual">
                {esImagen(archivoPreview) && archivoPreview.url ? (
                  <img src={archivoPreview.url} alt={archivoPreview.name} />
                ) : esPdf(archivoPreview) && archivoPreview.url ? (
                  <iframe
                    src={archivoPreview.url}
                    title={archivoPreview.name}
                  />
                ) : (
                  <div className="storage-preview-generico">
                    <span>📄</span>

                    <strong>Vista previa no disponible</strong>
                  </div>
                )}
              </div>

              <div className="storage-preview-datos">
                <div>
                  <span>Nombre</span>

                  <strong>{archivoPreview.name}</strong>
                </div>

                <div>
                  <span>Ruta</span>

                  <strong>{archivoPreview.fullPath}</strong>
                </div>

                <div>
                  <span>Tipo</span>

                  <strong>{archivoPreview.contentType || "—"}</strong>
                </div>

                <div>
                  <span>Tamaño</span>

                  <strong>{formatearBytes(archivoPreview.size)}</strong>
                </div>

                <div>
                  <span>Creado</span>

                  <strong>{formatearFecha(archivoPreview.timeCreated)}</strong>
                </div>

                <div>
                  <span>Modificado</span>

                  <strong>{formatearFecha(archivoPreview.updated)}</strong>
                </div>
              </div>
            </div>

            <div className="storage-preview-footer">
              {selectorMode && onSelectFile && (
                <button
                  type="button"
                  className="storage-btn-select"
                  onClick={() => onSelectFile(archivoPreview)}
                >
                  ✓ Usar este archivo
                </button>
              )}

              <button type="button" onClick={() => copiarRuta(archivoPreview)}>
                📋 Copiar ruta
              </button>

              <button
                type="button"
                onClick={() => renombrarArchivo(archivoPreview)}
              >
                ✏️ Renombrar
              </button>

              <button
                type="button"
                onClick={() => descargarArchivo(archivoPreview)}
              >
                ⬇️ Descargar
              </button>

              <button
                type="button"
                className="storage-btn-danger"
                onClick={() => eliminarArchivo(archivoPreview)}
              >
                🗑️ Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageDrive;
