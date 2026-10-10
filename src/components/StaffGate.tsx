"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Role = "admin" | "bar";

/** Login cu email + parolă; lasă să treacă doar conturile din tabela `staff` cu rolul potrivit. */
export function StaffGate({ need, title, children }: { need: Role; title: string; children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // Rolul e legat de user-ul pentru care a fost citit, ca să nu rămână de la alt cont.
  const [roleOf, setRoleOf] = useState<{ userId: string; role: Role | null } | null>(null);
  const userId = session?.user.id;
  const role = !session ? null : roleOf && roleOf.userId === userId ? roleOf.role : undefined;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const db = supabase();
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase()
      .from("staff")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setRoleOf({ userId, role: (data?.role as Role) ?? null }));
  }, [userId]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) setError("Email sau parolă greșită.");
  }

  if (session === undefined || (session && role === undefined)) {
    return <p className="p-10 text-center text-muted">Se încarcă…</p>;
  }

  const allowed = role === "admin" || role === need;

  if (!session || !allowed) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-5">
        <h1 className="font-display text-3xl text-accent">{title}</h1>
        {session && !allowed ? (
          <>
            <p className="text-danger">Contul {session.user.email} nu are acces aici.</p>
            <button onClick={() => supabase().auth.signOut()} className="rounded-xl border border-line py-3">
              Ieșire
            </button>
          </>
        ) : (
          <form onSubmit={login} className="flex flex-col gap-3">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Parolă" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button className="rounded-xl bg-accent py-3 font-semibold text-accent-ink">Intră</button>
          </form>
        )}
      </main>
    );
  }

  return <>{children}</>;
}

export function SignOut() {
  return (
    <button onClick={() => supabase().auth.signOut()} className="text-sm text-muted underline">
      Ieșire
    </button>
  );
}
