import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const API_URL = "http://localhost:8000/api/auth/login/";
      
      // IMPORTANT : Utilisez 'username' au lieu de 'email'
      const credentials = {
        username: identifier,  // ← CHANGEMENT ICI
        password: password
      };

      const resp = await axios.post(API_URL, credentials, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      // Gestion de la réponse
      if (resp.data?.token) {
        localStorage.setItem("authToken", resp.data.token);
        
        // Stockage des infos utilisateur si disponibles
        if (resp.data.user) {
          localStorage.setItem("user", JSON.stringify(resp.data.user));
        }
        
        navigate("/dashboard");
      } else {
        setError("Connexion réussie mais aucun token reçu.");
      }
    } catch (err) {
      // Gestion d'erreur améliorée
      let errorMessage = "Identifiants incorrects ou erreur serveur.";
      
      if (err.response) {
        const data = err.response.data;
        
        if (data.detail) {
          errorMessage = data.detail;
        } else if (data.non_field_errors) {
          errorMessage = data.non_field_errors[0];
        } else if (data.username) {
          errorMessage = `Nom d'utilisateur: ${data.username[0]}`;
        } else if (data.password) {
          errorMessage = `Mot de passe: ${data.password[0]}`;
        } else if (typeof data === 'object') {
          const firstError = Object.values(data)[0];
          errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
        }
      } else if (err.request) {
        errorMessage = "Impossible de contacter le serveur. Vérifiez que Django est démarré sur le port 8000.";
      } else if (err.code === 'ECONNREFUSED') {
        errorMessage = "Serveur Django non accessible. Vérifiez qu'il est démarré sur le port 8000.";
      }
      
      setError(errorMessage);
      console.error('Erreur de connexion:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8efff] p-6">
      <div className="w-full max-w-6xl bg-white shadow-xl rounded-3xl overflow-hidden flex flex-col md:flex-row">
        {/* --- LEFT PANEL --- */}
        <div className="relative md:w-1/2 w-full flex items-center justify-center bg-gradient-to-b from-[#5338ff] via-[#3e0df5] to-[#180073] text-white p-12">
          <svg
            className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] opacity-20"
            viewBox="0 0 600 600"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <circle cx="300" cy="300" r="300" fill="none" stroke="white" strokeWidth="8" />
            <circle cx="300" cy="300" r="220" fill="none" stroke="white" strokeWidth="5" opacity="0.6" />
            <circle cx="300" cy="300" r="140" fill="none" stroke="white" strokeWidth="3" opacity="0.4" />
          </svg>

          <div className="relative z-10 max-w-sm text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
              SomaneERP
            </h1>
            <p className="text-indigo-100 text-sm md:text-base mb-6">
              Le futur, c'est la digitalisation. SOMANE c'est le futur.
            </p>
            <button
              type="button"
              className="px-5 py-2 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-full text-sm font-medium hover:bg-opacity-30 transition"
            >
              En savoir plus
            </button>
          </div>

          <svg
            className="absolute bottom-[-80px] left-[-80px] w-[400px] h-[400px] opacity-10"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <circle cx="100" cy="100" r="100" fill="white" />
          </svg>
        </div>

        {/* --- RIGHT PANEL --- */}
        <div className="md:w-1/2 w-full flex items-center justify-center p-10 md:p-16">
          <div className="w-full max-w-md">
            <h2 className="text-xl font-semibold">Connectez-vous!</h2>
            <p className="text-sm text-gray-500 mb-6">Accédez à votre espace en toute sécurité.</p>

            <form onSubmit={submit} className="space-y-4">
              {/* Identifier */}
              <label className="block">
                <div className="relative">
                  <input
                    type="text" // Changé en 'text' pour accepter username ou email
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Nom d'utilisateur" // ← CHANGEMENT ICI
                    className="w-full border border-gray-200 rounded-full px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    aria-label="Nom d'utilisateur"
                    required
                    disabled={loading}
                  />
                  <svg
                    className="w-4 h-4 absolute left-3 top-3 text-gray-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </label>

              {/* Password */}
              <label className="block">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe"
                    className="w-full border border-gray-200 rounded-full px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    aria-label="Password"
                    required
                    disabled={loading}
                  />
                  <svg
                    className="w-4 h-4 absolute left-3 top-3 text-gray-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2.05 12.55C3.67 7.13 8.22 4 12 4c3.78 0 8.33 3.13 9.95 8.55-.89 2.93-3.02 5.07-5.32 6.14A9.97 9.97 0 0112 20c-2.14 0-4.12-.56-5.95-1.53"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    aria-label="Toggle password visibility"
                    disabled={loading}
                  >
                    {showPassword ? "Cacher" : "Voir"}
                  </button>
                </div>
              </label>

              {/* Error */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 border border-red-200">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              {/* Submit */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full py-3 text-white bg-gradient-to-r from-[#5142ff] to-[#4a19ff] hover:opacity-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {loading ? (
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="white"
                        strokeWidth="4"
                        fill="none"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="white"
                        d="M4 12a8 8 0 018-8v8z"
                      ></path>
                    </svg>
                  ) : null}
                  <span className="text-sm font-medium">
                    {loading ? "Connexion..." : "Connexion"}
                  </span>
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => alert("Flow mot de passe oublié à implémenter")}
                  className="text-xs text-gray-400 hover:underline disabled:opacity-50"
                  disabled={loading}
                >
                  Mot de passe oublié
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}