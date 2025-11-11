import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await axios.post("/api/auth/login/", { identifier, password });
      if (resp.data?.token) {
        localStorage.setItem("token", resp.data.token);
        navigate("/");
      } else {
        setError("Connexion réussie mais aucun token reçu.");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Identifiants incorrects ou erreur serveur.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8efff] p-6">
      <div className="w-full max-w-6xl bg-white shadow-xl rounded-3xl overflow-hidden flex flex-col md:flex-row">
        {/* --- LEFT PANEL --- */}
        <div className="relative md:w-1/2 w-full flex items-center justify-center bg-gradient-to-b from-[#5338ff] via-[#3e0df5] to-[#180073] text-white p-12">
          {/* Background decorative SVGs */}
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

          {/* Subtle curved shape at bottom-left */}
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
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Addresse e-mail"
                    className="w-full border border-gray-200 rounded-full px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    aria-label="Email or username"
                  />
                  <svg
                    className="w-4 h-4 absolute left-3 top-3 text-gray-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 8a4 4 0 014-4h10a4 4 0 014 4v8a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 13h8"
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
                    placeholder="Mot de passe "
                    className="w-full border border-gray-200 rounded-full px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    aria-label="Password"
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
                    className="absolute right-3 top-2.5 text-sm text-gray-500"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "Cacher" : "Voir"}
                  </button>
                </div>
              </label>

              {/* Error */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              {/* Submit */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full py-3 text-white bg-gradient-to-r from-[#5142ff] to-[#4a19ff] hover:opacity-95 flex items-center justify-center gap-2"
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
                    {loading ? "Connecting..." : "Connexion"}
                  </span>
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => alert("Flow mot de passe oublié à implémenter")}
                  className="text-xs text-gray-400 hover:underline"
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
