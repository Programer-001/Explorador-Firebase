// src/acciones.tsx

import React, { useEffect, useState } from "react";
import { ref, get, set, remove, push } from "firebase/database";
import { db } from "./firebase/config";

interface Nodo {
  [key: string]: any;
}

const App: React.FC = () => {
  const [data, setData] = useState<Nodo>({});
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string>("");
  const [rutaDestino, setRutaDestino] = useState<string>("");
  const [expandido, setExpandido] = useState<{ [key: string]: boolean }>({});
  const [tablaData, setTablaData] = useState<any[]>([]);
  const [columnasTabla, setColumnasTabla] = useState<string[]>([]);
  const [modoEdicion, setModoEdicion] = useState(false);

  const toggleExpand = (ruta: string) => {
    setExpandido((prev) => ({
      ...prev,
      [ruta]: !prev[ruta],
    }));
  };

  // 🔹 Cargar toda la DB
  const cargarDB = async () => {
    const snapshot = await get(ref(db, "/"));

    if (snapshot.exists()) {
      setData(snapshot.val());
    }
  };

  useEffect(() => {
    cargarDB();
  }, []);

  // 🔹 Render recursivo tipo carpetas
  const esCarpeta = (valor: any) => {
    if (!valor || typeof valor !== "object") return false;

    const keys = Object.keys(valor);

    // 👉 Si al menos un hijo es objeto → es carpeta
    return keys.some((k) => typeof valor[k] === "object");
  };

  const renderNodo = (obj: any, rutaActual: string = "") => {
    if (!obj || typeof obj !== "object") return null;

    return Object.keys(obj).map((key) => {
      const nuevaRuta = rutaActual ? `${rutaActual}/${key}` : key;

      const valor = obj[key];
      const esFolder = esCarpeta(valor);
      const abierto = expandido[nuevaRuta];

      const seleccionado = rutaSeleccionada === nuevaRuta;

      return (
        <div key={nuevaRuta} style={{ marginLeft: 15 }}>
          <div
            style={{
              cursor: "pointer",
              padding: "5px",

              background: seleccionado
                ? "var(--selected-bg)"
                : "transparent",

              color: seleccionado
                ? "var(--selected-text)"
                : "var(--text)",

              border: seleccionado
                ? "1px solid var(--selected-border)"
                : "1px solid transparent",

              borderRadius: "5px",

              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
            onClick={() => setRutaSeleccionada(nuevaRuta)}
            onDoubleClick={() => {
              if (esFolder) toggleExpand(nuevaRuta);
            }}
          >
            {esFolder ? (abierto ? "📂" : "📁") : "📄"}
            {key}
          </div>

          {/* 🔹 SOLO si es carpeta se expande */}
          {esFolder && abierto && renderNodo(valor, nuevaRuta)}

          {/* 🔹 Si es archivo (registro), mostrar preview pequeño */}
          {!esFolder && typeof valor !== "object" && (
            <div
              style={{
                marginLeft: 20,
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              {String(valor)}
            </div>
          )}
        </div>
      );
    });
  };

  // 🔹 Copiar
  const copiarNodo = async () => {
    if (!rutaSeleccionada || !rutaDestino) {
      alert("Selecciona origen y destino");
      return;
    }

    try {
      const origenRef = ref(db, rutaSeleccionada);

      const nombreNodo = rutaSeleccionada.split("/").pop();
      const destinoFinal = `${rutaDestino}/${nombreNodo}`;

      const destinoRef = ref(db, destinoFinal);

      const snapshot = await get(origenRef);

      if (!snapshot.exists()) {
        alert("No hay datos en origen");
        return;
      }

      const data = snapshot.val();

      // SOLO COPIA
      await set(destinoRef, data);

      alert("Copiado correctamente 📦");

      cargarDB();
    } catch (error) {
      console.error(error);
      alert("Error al copiar");
    }
  };

  // 🔹 Mover
  const moverNodo = async () => {
    if (!rutaSeleccionada || !rutaDestino) {
      alert("Selecciona origen y destino");
      return;
    }

    // 🚫 evitar errores
    if (rutaDestino.startsWith(rutaSeleccionada)) {
      alert("No puedes mover dentro del mismo nodo");
      return;
    }

    try {
      const origenRef = ref(db, rutaSeleccionada);

      const nombreNodo = rutaSeleccionada.split("/").pop();
      const destinoFinal = `${rutaDestino}/${nombreNodo}`;

      const destinoRef = ref(db, destinoFinal);

      const snapshot = await get(origenRef);

      if (!snapshot.exists()) {
        alert("No hay datos en origen");
        return;
      }

      const data = snapshot.val();

      // copiar
      await set(destinoRef, data);

      // borrar original
      await remove(origenRef);

      alert("Movido correctamente 🚀");

      setRutaSeleccionada("");
      cargarDB();
    } catch (error) {
      console.error(error);
      alert("Error al mover");
    }
  };

  // 🔹 Eliminar original
  const eliminarOriginal = async () => {
    if (!rutaSeleccionada) {
      alert("Selecciona algo para eliminar");
      return;
    }

    if (!window.confirm("¿Seguro que quieres eliminar este nodo?")) return;

    try {
      await remove(ref(db, rutaSeleccionada));

      setRutaSeleccionada("");

      cargarDB();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar");
    }
  };

  // 🔹 Ver Coleccion
  const cargarTabla = async () => {
    if (!rutaSeleccionada) {
      alert("Selecciona una colección");
      return;
    }

    try {
      const snapshot = await get(ref(db, rutaSeleccionada));

      if (!snapshot.exists()) {
        alert("No hay datos");
        return;
      }

      const data = snapshot.val();

      // 🔹 convertir a array
      const filas = Object.keys(data).map((key) => ({
        uid: key,
        ...data[key],
      }));

      setTablaData(filas);

      // 🔹 obtener columnas dinámicas
      const columnasSet = new Set<string>();

      filas.forEach((fila) => {
        Object.keys(fila).forEach((col) => columnasSet.add(col));
      });

      setColumnasTabla(Array.from(columnasSet));
    } catch (error) {
      console.error(error);
      alert("Error al cargar tabla");
    }
  };

  // 🔹 Renombrar Columna
  const renombrarColumna = (colVieja: string, colNueva: string) => {
    const nuevasFilas = tablaData.map((fila) => {
      const nuevaFila = { ...fila };

      if (colVieja in nuevaFila) {
        nuevaFila[colNueva] = nuevaFila[colVieja];

        delete nuevaFila[colVieja];
      }

      return nuevaFila;
    });

    setTablaData(nuevasFilas);

    const nuevasColumnas = columnasTabla.map((col) =>
      col === colVieja ? colNueva : col
    );

    setColumnasTabla(nuevasColumnas);
  };

  // 🔹 Guardar modo edicion
  const guardarCambiosTabla = async () => {
    if (!rutaSeleccionada) return;

    try {
      for (const fila of tablaData) {
        const { uid, ...data } = fila;

        await set(ref(db, `${rutaSeleccionada}/${uid}`), data);
      }

      alert("Cambios guardados 🚀");
    } catch (error) {
      console.error(error);
      alert("Error al guardar");
    }
  };

  // 🔹 Eliminar fila
  const eliminarFila = async (uid: string) => {
    if (!rutaSeleccionada) return;

    if (!window.confirm("¿Eliminar esta fila?")) return;

    try {
      await remove(ref(db, `${rutaSeleccionada}/${uid}`));

      // actualizar tabla local
      const nuevasFilas = tablaData.filter((fila) => fila.uid !== uid);

      setTablaData(nuevasFilas);

      alert("Fila eliminada 🗑️");
    } catch (error) {
      console.error(error);
      alert("Error al eliminar fila");
    }
  };

  // 🔹 Agregar Fila
  const agregarFila = async () => {
    if (!rutaSeleccionada) {
      alert("Selecciona una colección primero");
      return;
    }

    try {
      let uid = "";

      const usarAuto = window.confirm(
        "¿Quieres generar UID automática?\nAceptar = automática\nCancelar = manual"
      );

      if (usarAuto) {
        const newRef = push(ref(db, rutaSeleccionada));

        uid = newRef.key as string;
      } else {
        const manual = prompt("Ingresa UID manual:");

        if (!manual) return;

        uid = manual;
      }

      // 🔹 crear objeto vacío con columnas actuales
      const nuevaFila: any = { uid };

      columnasTabla.forEach((col) => {
        if (col !== "uid") nuevaFila[col] = "";
      });

      // 🔹 agregar a la tabla local
      setTablaData((prev) => [...prev, nuevaFila]);

      // 🔹 activar edición automáticamente
      setModoEdicion(true);
    } catch (error) {
      console.error(error);
      alert("Error al agregar fila");
    }
  };

  //------------------------------------inicio HTML

  return (
    <div
      style={{
        display: "flex",
        padding: 20,
        color: "var(--text)",
      }}
    >
      {/* 🌳 Árbol */}

      <div
        style={{
          width: "50%",
          borderRight: "1px solid var(--border)",
        }}
      >
        <h2>📂 Firebase DB</h2>

        {renderNodo(data)}
      </div>

      {/* ⚙️ Panel */}

      <div
        style={{
          width: "50%",
          padding: 20,
        }}
      >
        <h2>⚙️ Acciones</h2>

        <p>
          <strong>Ruta seleccionada:</strong>
        </p>

        <div
          style={{
            background: "var(--readonly-bg)",
            color: "var(--readonly-text)",
            border: "1px solid var(--readonly-border)",
            padding: 10,
            marginBottom: 10,
          }}
        >
          {rutaSeleccionada || "Nada seleccionado"}
        </div>

        <p>
          <strong>Ruta destino:</strong>
        </p>

        <input
          type="text"
          placeholder="Ej: catalogos/dobleces"
          value={rutaDestino}
          onChange={(e) => setRutaDestino(e.target.value)}
          style={{
            width: "100%",
            padding: 8,
            marginBottom: 10,
          }}
        />

        <button
          onClick={copiarNodo}
          style={{
            marginRight: 10,
          }}
        >
          📦 Copiar
        </button>

        <button
          onClick={moverNodo}
          style={{
            marginRight: 10,
          }}
        >
          🚚 Mover a destino
        </button>

        <button
          onClick={eliminarOriginal}
          style={{
            background: "red",
            color: "#fff",
          }}
        >
          🗑️ Eliminar original
        </button>

        <hr />

        <button onClick={cargarDB}>
          🔄 Recargar DB
        </button>

        <button
          onClick={cargarTabla}
          style={{
            marginTop: 10,
          }}
        >
          📊 Ver como tabla
        </button>

        {tablaData.length > 0 && (
          <div
            style={{
              marginTop: 20,
            }}
          >
            <h3>📋 Vista de tabla</h3>

            <table
              border={1}
              style={{
                width: "100%",
                marginTop: 10,
                borderColor: "var(--border)",
              }}
            >
              <thead>
                <tr>
                  {columnasTabla.map((col) => (
                    <th key={col}>
                      {modoEdicion ? (
                        <input
                          defaultValue={col}
                          onBlur={(e) => {
                            const nuevoNombre = e.target.value.trim();

                            if (!nuevoNombre || nuevoNombre === col) return;

                            renombrarColumna(col, nuevoNombre);
                          }}
                          style={{
                            width: "100%",
                          }}
                        />
                      ) : (
                        col
                      )}
                    </th>
                  ))}

                  {/* 🔴 Nueva columna */}

                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {tablaData.map((fila, i) => (
                  <tr key={i}>
                    {columnasTabla.map((col) => (
                      <td key={col}>
                        {modoEdicion ? (
                          <input
                            value={fila[col] ?? ""}
                            onChange={(e) => {
                              const nuevas = [...tablaData];

                              nuevas[i][col] = e.target.value;

                              setTablaData(nuevas);
                            }}
                            style={{
                              width: "100%",
                            }}
                          />
                        ) : (
                          String(fila[col] ?? "")
                        )}
                      </td>
                    ))}

                    {/* 🔴 BOTÓN ELIMINAR FILA */}

                    <td>
                      {modoEdicion && (
                        <button
                          onClick={() => eliminarFila(fila.uid)}
                          style={{
                            background: "red",
                            color: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button onClick={() => setModoEdicion(!modoEdicion)}>
              {modoEdicion ? "❌ Cancelar edición" : "✏️ Editar tabla"}
            </button>

            {modoEdicion && (
              <>
                <button onClick={guardarCambiosTabla}>
                  💾 Guardar cambios
                </button>

                <button
                  onClick={agregarFila}
                  style={{
                    marginTop: 10,
                  }}
                >
                  ➕ Agregar fila
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* FIN ⚙️ Panel */}
    </div>
  );
};

export default App;