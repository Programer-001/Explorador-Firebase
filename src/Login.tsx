// src/Login.tsx

import React, { useState } from "react";

import { signInWithEmailAndPassword } from "firebase/auth";

import { auth } from "./firebase/config";

interface LoginProps {
  onLogin?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("proyectos.raff@gmail.com");

  const [password, setPassword] = useState("");

  const [cargando, setCargando] = useState(false);

  const [error, setError] = useState("");

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Ingresa correo y contraseña.");

      return;
    }

    try {
      setCargando(true);
      setError("");

      const credencial = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      /*
        Segunda protección dentro
        de la aplicación.
      */

      if (credencial.user.uid !== "1eLgzhZlNIXnh7WkswhJfdQbmtt1") {
        await auth.signOut();

        setError("Este usuario no tiene permisos de administrador.");

        return;
      }

      onLogin?.();
    } catch (error) {
      console.error("Error iniciando sesión:", error);

      setError("Correo o contraseña incorrectos.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4f6f8",
        fontFamily: "Arial, sans-serif",
        padding: "20px",
      }}
    >
      <form
        onSubmit={iniciarSesion}
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "28px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
        }}
      >
        <h2
          style={{
            margin: "0 0 5px",
          }}
        >
          🔐 Administración
        </h2>

        <p
          style={{
            margin: "0 0 22px",
            color: "#777",
            fontSize: "13px",
          }}
        >
          Inicia sesión para acceder a las herramientas.
        </p>

        <label
          style={{
            display: "block",
            marginBottom: "15px",
          }}
        >
          <span
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Correo
          </span>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              boxSizing: "border-box",
              border: "1px solid #ccc",
              borderRadius: "6px",
            }}
          />
        </label>

        <label
          style={{
            display: "block",
            marginBottom: "18px",
          }}
        >
          <span
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Contraseña
          </span>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              padding: "10px",
              boxSizing: "border-box",
              border: "1px solid #ccc",
              borderRadius: "6px",
            }}
          />
        </label>

        {error && (
          <div
            style={{
              marginBottom: "15px",
              padding: "9px",
              borderRadius: "6px",
              background: "#fff0f0",
              color: "#b42318",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={cargando}
          style={{
            width: "100%",
            minHeight: "42px",
            border: 0,
            borderRadius: "7px",
            background: "#007bff",
            color: "#fff",
            fontWeight: 600,
            cursor: cargando ? "wait" : "pointer",
          }}
        >
          {cargando ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
};

export default Login;
