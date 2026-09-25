import React, { useState } from "react";
import { ref, set, push } from "firebase/database";
import { db } from "./firebase/config";

const TablaDinamica: React.FC = () => {
  const [nombreTabla, setNombreTabla] = useState("");
  const [ruta, setRuta] = useState("");
  const [textoExcel, setTextoExcel] = useState("");

  const [columnas, setColumnas] = useState<string[]>([]);
  const [nuevaColumna, setNuevaColumna] = useState("");

  const [filas, setFilas] = useState<any[]>([]);

  // ➕ agregar columna
  const agregarColumna = () => {
    if (!nuevaColumna) return;

    setColumnas([...columnas, nuevaColumna]);
    setNuevaColumna("");
  };

  // ➕ agregar fila vacía
  const agregarFila = () => {
    const nueva: { [key: string]: any } = {};

    columnas.forEach((col) => {
      nueva[col] = "";
    });

    setFilas([...filas, nueva]);
  };

  // ✏️ editar celda
  const editarCelda = (
    index: number,
    columna: string,
    valor: string
  ) => {
    const nuevas = [...filas];

    nuevas[index][columna] = valor;

    setFilas(nuevas);
  };

  // 💾 guardar en Firebase
  const guardarTabla = async () => {
    if (!ruta || columnas.length === 0) {
      alert("Falta ruta o columnas");
      return;
    }

    try {
      const baseRef = ref(db, ruta);

      for (const fila of filas) {
        const nuevaRef = push(baseRef);

        await set(nuevaRef, fila);
      }

      alert("Tabla guardada 🚀");
    } catch (error) {
      console.error(error);

      alert("Error al guardar");
    }
  };

  // 📥 importar desde Excel
  const importarDesdeExcel = () => {
    if (!textoExcel) return;

    const filasTexto = textoExcel.trim().split("\n");

    if (filasTexto.length === 0) return;

    // 🔹 Primera fila = columnas
    const nuevasColumnas = filasTexto[0].split("\t");

    // 🔹 Filas
    const nuevasFilas = filasTexto.slice(1).map((fila) => {
      const valores = fila.split("\t");

      const obj: { [key: string]: any } = {};

      nuevasColumnas.forEach((col, index) => {
        obj[col] = valores[index] || "";
      });

      return obj;
    });

    setColumnas(nuevasColumnas);
    setFilas(nuevasFilas);

    alert("Tabla importada 🚀");
  };

  return (
    <div
      style={{
        padding: 20,
        color: "var(--text)",
        background: "var(--bg)",
        minHeight: "100%",
      }}
    >
      {/* ================================
          TÍTULO
      ================================= */}

      <h2>🧱 Crear Tabla</h2>

      {/* ================================
          DATOS GENERALES
      ================================= */}

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 15,
        }}
      >
        {/* Nombre */}

        <input
          placeholder="Nombre de la tabla"
          value={nombreTabla}
          onChange={(e) => setNombreTabla(e.target.value)}
          style={{
            padding: 8,
            background: "var(--input-bg)",
            color: "var(--input-text)",
            border: "1px solid var(--border)",
          }}
        />

        {/* Ruta */}

        <input
          placeholder="Ruta (ej: catalogos/productos)"
          value={ruta}
          onChange={(e) => setRuta(e.target.value)}
          style={{
            padding: 8,
            minWidth: 280,
            background: "var(--input-bg)",
            color: "var(--input-text)",
            border: "1px solid var(--border)",
          }}
        />
      </div>

      <hr
        style={{
          border: 0,
          borderTop: "1px solid var(--border)",
        }}
      />

      {/* ================================
          IMPORTAR EXCEL
      ================================= */}

      <h3>📥 Importar desde Excel</h3>

      <textarea
        placeholder="Pega aquí tu tabla de Excel"
        value={textoExcel}
        onChange={(e) => setTextoExcel(e.target.value)}
        rows={6}
        style={{
          width: "100%",
          marginBottom: 10,
          padding: 10,
          resize: "vertical",

          background: "var(--input-bg)",
          color: "var(--input-text)",

          border: "1px solid var(--border)",
          borderRadius: 4,
        }}
      />

      <button onClick={importarDesdeExcel}>
        📊 Importar tabla
      </button>

      <hr
        style={{
          border: 0,
          borderTop: "1px solid var(--border)",
          marginTop: 15,
        }}
      />

      {/* ================================
          COLUMNAS
      ================================= */}

      <h3>Columnas</h3>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Nombre columna"
          value={nuevaColumna}
          onChange={(e) => setNuevaColumna(e.target.value)}
          style={{
            padding: 8,

            background: "var(--input-bg)",
            color: "var(--input-text)",

            border: "1px solid var(--border)",
          }}
        />

        <button onClick={agregarColumna}>
          ➕ Agregar columna
        </button>
      </div>

      {/* Columnas existentes */}

      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {columnas.map((col, i) => (
          <span
            key={i}
            style={{
              padding: "4px 8px",

              background: "var(--surface-2)",
              color: "var(--text)",

              border: "1px solid var(--border)",
              borderRadius: 4,
            }}
          >
            {col}
          </span>
        ))}
      </div>

      <hr
        style={{
          border: 0,
          borderTop: "1px solid var(--border)",
          marginTop: 15,
        }}
      />

      {/* ================================
          FILAS
      ================================= */}

      <h3>Filas</h3>

      <button onClick={agregarFila}>
        ➕ Agregar fila
      </button>

      {/* ================================
          TABLA
      ================================= */}

      <div
        style={{
          width: "100%",
          overflowX: "auto",
          marginTop: 10,
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            color: "var(--text)",
          }}
        >
          <thead>
            <tr>
              {columnas.map((col) => (
                <th
                  key={col}
                  style={{
                    padding: 8,

                    background: "var(--surface)",
                    color: "var(--text)",

                    border: "1px solid var(--border)",
                    textAlign: "left",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filas.map((fila, i) => (
              <tr key={i}>
                {columnas.map((col) => (
                  <td
                    key={col}
                    style={{
                      padding: 4,

                      background: "var(--bg)",
                      color: "var(--text)",

                      border: "1px solid var(--border)",
                    }}
                  >
                    <input
                      value={fila[col]}
                      onChange={(e) =>
                        editarCelda(
                          i,
                          col,
                          e.target.value
                        )
                      }
                      style={{
                        width: "100%",
                        padding: 6,

                        background: "var(--input-bg)",
                        color: "var(--input-text)",

                        border: "1px solid var(--border)",
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <br />

      {/* ================================
          GUARDAR
      ================================= */}

      <button onClick={guardarTabla}>
        💾 Guardar en Firebase
      </button>
    </div>
  );
};

export default TablaDinamica;