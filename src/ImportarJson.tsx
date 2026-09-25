import React, { useState } from "react";

import { ref, set, get } from "firebase/database";

import { db } from "./firebase/config";

const ImportarJson: React.FC = () => {
  const [ruta, setRuta] = useState("");

  const [textoJson, setTextoJson] = useState("");

  const [jsonValido, setJsonValido] = useState<boolean | null>(null);

  const [procesando, setProcesando] = useState(false);

  // Limpia la ruta
  const limpiarRuta = (valor: string) => {
    return valor.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  };

  // Convertir texto a JSON
  const obtenerJson = () => {
    if (!textoJson.trim()) {
      throw new Error("No has pegado ningún JSON.");
    }

    return JSON.parse(textoJson);
  };

  // Validar JSON
  const validarJson = () => {
    try {
      const data = obtenerJson();

      console.log("JSON válido:", data);

      setJsonValido(true);

      alert("✅ JSON válido");
    } catch (error) {
      console.error(error);

      setJsonValido(false);

      if (error instanceof Error) {
        alert(`❌ JSON inválido:\n${error.message}`);
      } else {
        alert("❌ JSON inválido");
      }
    }
  };

  // Subir JSON
  const subirJson = async () => {
    const rutaLimpia = limpiarRuta(ruta);

    // Protección importante
    if (!rutaLimpia) {
      alert(
        "⚠️ Debes indicar una ruta.\n\nPor seguridad no se permite escribir directamente en la raíz."
      );

      return;
    }

    if (rutaLimpia === "/") {
      alert("⚠️ No se permite sobrescribir la raíz de Firebase.");

      return;
    }

    let data: any;

    try {
      data = obtenerJson();
    } catch (error) {
      setJsonValido(false);

      if (error instanceof Error) {
        alert(`❌ JSON inválido:\n${error.message}`);
      }

      return;
    }

    setJsonValido(true);

    /*
      =====================================================
      EVITAR DUPLICAR EL NOMBRE DEL NODO
      =====================================================

      Ejemplo:

      Ruta:
      Plantillas_Menu

      JSON:
      {
        "Plantillas_Menu": {
          ...
        }
      }

      En lugar de crear:
      Plantillas_Menu/Plantillas_Menu

      automáticamente toma solamente el contenido interior.
    */

    const partesRuta = rutaLimpia.split("/");

    const nombreNodo = partesRuta[partesRuta.length - 1];

    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      Object.keys(data).length === 1 &&
      Object.prototype.hasOwnProperty.call(data, nombreNodo)
    ) {
      data = data[nombreNodo];
    }

    try {
      setProcesando(true);

      const destinoRef = ref(db, rutaLimpia);

      // Revisar si ya existe
      const snapshot = await get(destinoRef);

      if (snapshot.exists()) {
        const confirmar = window.confirm(
          `⚠️ Ya existen datos en:\n\n${rutaLimpia}\n\n` +
            "Si continúas, TODO el contenido de esta ruta será reemplazado.\n\n" +
            "¿Deseas continuar?"
        );

        if (!confirmar) {
          setProcesando(false);

          return;
        }
      } else {
        const confirmar = window.confirm(
          `Se creará la siguiente ruta:\n\n${rutaLimpia}\n\n¿Continuar?`
        );

        if (!confirmar) {
          setProcesando(false);

          return;
        }
      }

      await set(destinoRef, data);

      alert(`✅ JSON guardado correctamente en:\n${rutaLimpia}`);

      setTextoJson("");

      setJsonValido(null);
    } catch (error) {
      console.error(error);

      alert("❌ Error al subir el JSON a Firebase.");
    } finally {
      setProcesando(false);
    }
  };

  // Limpiar formulario
  const limpiar = () => {
    setRuta("");

    setTextoJson("");

    setJsonValido(null);
  };

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 1100,
        margin: "0 auto",

        color: "var(--text)",
        background: "var(--bg)",
      }}
    >
      <h2>📤 Importar JSON a Firebase</h2>

      <p>
        Indica la ruta donde quieres guardar los datos y pega abajo el JSON.
      </p>

      {/* RUTA */}

      <div
        style={{
          marginBottom: 20,
          marginTop: 15,
        }}
      >
        <label
          style={{
            display: "block",
            fontWeight: "bold",
            marginBottom: 5,
          }}
        >
          Ruta en Firebase
        </label>

        <input
          type="text"
          placeholder="Ej: Plantillas_Menu"
          value={ruta}
          onChange={(e) => setRuta(e.target.value)}
          style={{
            width: "100%",
            padding: 10,

            boxSizing: "border-box",

            fontSize: 16,

            background: "var(--input-bg)",
            color: "var(--input-text)",

            border: "1px solid var(--border)",
            borderRadius: 5,
          }}
        />

        <small
          style={{
            color: "var(--text-secondary)",
          }}
        >
          Ejemplos: Plantillas_Menu, catalogos/productos,
          configuracion/menu
        </small>
      </div>

      {/* JSON */}

      <div
        style={{
          marginBottom: 15,
        }}
      >
        <label
          style={{
            display: "block",
            fontWeight: "bold",
            marginBottom: 5,
          }}
        >
          JSON
        </label>

        <textarea
          placeholder={`{
  "asesor_ventas": {
    "area": "Mostrador",
    "puesto": "Asesor de ventas"
  }
}`}
          value={textoJson}
          onChange={(e) => {
            setTextoJson(e.target.value);

            setJsonValido(null);
          }}
          rows={25}
          spellCheck={false}
          style={{
            width: "100%",

            fontFamily: "monospace",
            fontSize: 14,

            padding: 12,

            boxSizing: "border-box",

            resize: "vertical",

            background: "var(--input-bg)",
            color: "var(--input-text)",

            border:
              jsonValido === true
                ? "2px solid #28a745"
                : jsonValido === false
                  ? "2px solid #dc3545"
                  : "1px solid var(--border)",

            borderRadius: 5,
          }}
        />
      </div>

      {/* ESTADO */}

      {jsonValido === true && (
        <div
          style={{
            padding: 10,

            background: "var(--success-bg)",
            color: "var(--success-text)",

            border: "1px solid var(--success-border)",

            marginBottom: 10,

            borderRadius: 5,
          }}
        >
          ✅ JSON válido
        </div>
      )}

      {jsonValido === false && (
        <div
          style={{
            padding: 10,

            background: "var(--error-bg)",
            color: "var(--error-text)",

            border: "1px solid var(--error-border)",

            marginBottom: 10,

            borderRadius: 5,
          }}
        >
          ❌ El JSON contiene errores
        </div>
      )}

      {/* BOTONES */}

      <div
        style={{
          display: "flex",

          gap: 10,

          flexWrap: "wrap",
        }}
      >
        <button
          onClick={validarJson}
          style={{
            padding: "10px 15px",

            cursor: "pointer",
          }}
        >
          🔎 Validar JSON
        </button>

        <button
          onClick={subirJson}
          disabled={procesando}
          style={{
            padding: "10px 15px",

            background: "#28a745",
            color: "#ffffff",

            border: "none",

            borderRadius: 5,

            cursor: procesando
              ? "not-allowed"
              : "pointer",

            opacity: procesando ? 0.7 : 1,
          }}
        >
          {procesando
            ? "⏳ Subiendo..."
            : "📤 Subir a Firebase"}
        </button>

        <button
          onClick={limpiar}
          style={{
            padding: "10px 15px",

            cursor: "pointer",
          }}
        >
          🧹 Limpiar
        </button>
      </div>

      <hr
        style={{
          marginTop: 30,

          border: 0,

          borderTop: "1px solid var(--border)",
        }}
      />

      {/* ADVERTENCIA */}

      <div
        style={{
          background: "var(--warning-bg)",
          color: "var(--warning-text)",

          border: "1px solid var(--warning-border)",

          padding: 15,

          borderRadius: 5,
        }}
      >
        <strong>⚠️ Importante</strong>

        <p
          style={{
            marginBottom: 0,
            marginTop: 8,
          }}
        >
          Esta herramienta reemplaza únicamente los datos que estén en la ruta
          indicada. Por seguridad no permite escribir directamente sobre la raíz
          de Firebase.
        </p>
      </div>
    </div>
  );
};

export default ImportarJson;