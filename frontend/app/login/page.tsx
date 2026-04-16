"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await signIn("credentials", { username, password, callbackUrl: "/dashboard" });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0B0F1A]">
      <form onSubmit={handleSubmit} className="p-10 bg-[#161B22] border border-slate-800 rounded-xl shadow-2xl w-96">
        <h2 className="text-white text-2xl font-bold mb-6 text-center">RMM <span className="text-blue-500">Lite</span></h2>
        <input 
            type="text" 
            placeholder="Username" 
            className="w-full p-3 mb-4 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            onChange={(e) => setUsername(e.target.value)}
        />
        <input 
            type="password" 
            placeholder="Password" 
            className="w-full p-3 mb-6 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition duration-200">
          Access Console
        </button>
      </form>
    </div>
  );
}