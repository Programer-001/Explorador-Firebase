// src/App.tsx

import React, { useEffect, useState } from "react";

import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";

import Acciones from "./acciones";
import TablaDinamica from "./TablaDinamica";
import ImportarJson from "./ImportarJson";
import StorageDrive from "./storage/StorageDrive";
import Login from "./Login";

import { auth } from "./firebase/config";
import "./App.css";
type Vista = "explorador" | "tabla" | "json" | "storage";

const ADMIN_UID = "1eLgzhZlNIXnh7WkswhJfdQbmtt1";

const App: React.FC = () => {
  const [vista, setVista] = useState<Vista>("explorador");

  const [usuario, setUsuario] = useState<User | null>(null);

  const [cargandoAuth, setCargandoAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && user.uid === ADMIN_UID) {
        setUsuario(user);
      } else {
        setUsuario(null);
      }

      setCargandoAuth(false);
    });

    return () => unsub();
  }, []);


  if (cargandoAuth) {
    return (
      <div
        style={{
          padding: 30,
          fontFamily: "Arial, sans-serif",
        }}
      >
        Verificando sesión...
      </div>
    );
  }

  if (!usuario) {
    return (
      <Login
        onLogin={() => {
          /*
            onAuthStateChanged
            actualizará App.
          */
        }}
      />
    );
  }

return (
  <div className="app">

    {/* NAVBAR */}

    <div className="app-navbar">

      <button
        onClick={() => setVista("explorador")}
        className={`nav-button ${
          vista === "explorador" ? "active" : ""
        }`}
      >
        📂 Explorador DB
      </button>

      <button
        onClick={() => setVista("tabla")}
        className={`nav-button ${
          vista === "tabla" ? "active" : ""
        }`}
      >
        🧱 Crear Tabla
      </button>

      <button
        onClick={() => setVista("json")}
        className={`nav-button ${
          vista === "json" ? "active" : ""
        }`}
      >
        📤 Importar JSON
      </button>

      <button
        onClick={() => setVista("storage")}
        className={`nav-button ${
          vista === "storage" ? "active" : ""
        }`}
      >
        ☁️ Storage
      </button>

      <div className="nav-user">

        <span className="nav-email">
          {usuario.email}
        </span>

        <button
          onClick={() => signOut(auth)}
          className="logout-button"
        >
          Cerrar sesión
        </button>

      </div>
    </div>


    {/* CONTENIDO */}

    <div className="app-content">

      {vista === "explorador" && <Acciones />}

      {vista === "tabla" && <TablaDinamica />}

      {vista === "json" && <ImportarJson />}

      {vista === "storage" && <StorageDrive />}

    </div>

  </div>
);
};

export default App;
