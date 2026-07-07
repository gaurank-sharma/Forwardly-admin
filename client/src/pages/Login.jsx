import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@forwardly.in");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(email, password);
      nav("/");
    } catch (e) {
      setErr(e.response?.data?.error || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#0a0a0b] px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#c2f54b] font-black text-[#0a0a0b]">F</span>
          <div>
            <div className="font-bold leading-tight">Forwardly Leads</div>
            <div className="text-xs text-gray-500">Admin sign in</div>
          </div>
        </div>
        {err && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input className="input mb-4" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        <label className="mb-1 block text-sm font-medium">Password</label>
        <input className="input mb-6" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        <button disabled={busy} className="btn btn-primary w-full justify-center">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-center text-xs text-gray-400">Use the credentials shared by your admin.</p>
      </form>
    </div>
  );
}
