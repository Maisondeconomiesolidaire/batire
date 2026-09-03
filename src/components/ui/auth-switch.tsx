import { useState, type FormEvent, type HTMLAttributes, type ReactNode } from "react";
import { useSignIn, useSignUp } from "@clerk/clerk-react";
import { ArrowLeft, KeyRound, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

type Mode = "signin" | "signup" | "code" | "reset-request" | "reset" | "signup-code" | "mfa";

function message(error: unknown) {
  if (typeof error === "object" && error && "errors" in error) {
    const errors = (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    return errors?.[0]?.longMessage ?? errors?.[0]?.message ?? "Une erreur est survenue.";
  }
  return error instanceof Error ? error.message : "Une erreur est survenue.";
}

/** Écran Clerk entièrement personnalisé : les mots de passe et sessions restent gérés par Clerk. */
export function AuthSwitch({ initialMode = "signin" }: { initialMode?: "signin" | "signup" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("");
  const [mfaStrategy, setMfaStrategy] = useState<"email_code" | "phone_code" | "totp" | "backup_code">("totp");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnTo = params.get("redirect_url") || "/";

  const go = async (sessionId: string | null, setActive: (args: { session: string | null }) => Promise<void>) => {
    if (!sessionId) throw new Error("Session de connexion introuvable.");
    await setActive({ session: sessionId });
    navigate(returnTo, { replace: true });
  };
  const run = (action: () => Promise<void>) => async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    try { await action(); } catch (caught) { setError(message(caught)); } finally { setBusy(false); }
  };
  const sendLoginCode = async () => {
    if (!signInLoaded || !signIn) return;
    const result = await signIn.create({ strategy: "email_code", identifier: email });
    const factor = result.supportedFirstFactors?.find((item) => item.strategy === "email_code");
    if (!factor || factor.strategy !== "email_code") throw new Error("La connexion par code n'est pas disponible pour cette adresse.");
    await result.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
    setMode("code");
  };
  const loginWithPassword = async () => {
    if (!signInLoaded || !signIn) return;
    const result = await signIn.create({ strategy: "password", identifier: email, password });
    if (result.status === "complete") return go(result.createdSessionId, setSignInActive);
    if (result.status === "needs_second_factor") return prepareMfa(result);
    throw new Error("Cette connexion nécessite une étape supplémentaire.");
  };
  const prepareMfa = async (result: NonNullable<typeof signIn>) => {
    const factor = result.supportedSecondFactors?.[0];
    if (!factor) throw new Error("Aucune méthode de vérification supplémentaire n'est disponible.");
    if (factor.strategy === "email_code" || factor.strategy === "phone_code") await result.prepareSecondFactor({ strategy: factor.strategy });
    if (!["email_code", "phone_code", "totp", "backup_code"].includes(factor.strategy)) throw new Error("Méthode de sécurité non prise en charge par cet écran.");
    setMfaStrategy(factor.strategy as typeof mfaStrategy); setMode("mfa");
  };
  const completeLoginCode = async () => {
    if (!signIn) return;
    const result = await signIn.attemptFirstFactor({ strategy: "email_code", code });
    if (result.status === "complete") return go(result.createdSessionId, setSignInActive);
    if (result.status === "needs_second_factor") return prepareMfa(result);
    throw new Error("Code incorrect ou expiré.");
  };
  const resetPassword = async () => {
    if (!signInLoaded || !signIn) return;
    const result = await signIn.create({ strategy: "reset_password_email_code", identifier: email });
    const factor = result.supportedFirstFactors?.find((item) => item.strategy === "reset_password_email_code");
    if (!factor || factor.strategy !== "reset_password_email_code") throw new Error("La réinitialisation par email n'est pas disponible.");
    await result.prepareFirstFactor({ strategy: "reset_password_email_code", emailAddressId: factor.emailAddressId });
    setMode("reset");
  };
  const completeReset = async () => {
    if (!signIn) return;
    const result = await signIn.attemptFirstFactor({ strategy: "reset_password_email_code", code, password: newPassword });
    if (result.status === "complete") return go(result.createdSessionId, setSignInActive);
    throw new Error("Le code ou le nouveau mot de passe est invalide.");
  };
  const createAccount = async () => {
    if (!signUpLoaded || !signUp) return;
    const result = await signUp.create({ emailAddress: email, password, firstName, lastName });
    if (result.status === "complete") return go(result.createdSessionId, setSignUpActive);
    await result.prepareEmailAddressVerification({ strategy: "email_code" }); setMode("signup-code");
  };
  const completeSignup = async () => {
    if (!signUp) return;
    const result = await signUp.attemptEmailAddressVerification({ code });
    if (result.status === "complete") return go(result.createdSessionId, setSignUpActive);
    throw new Error("Code incorrect ou expiré.");
  };
  const completeMfa = async () => {
    if (!signIn) return;
    const result = await signIn.attemptSecondFactor({ strategy: mfaStrategy, code } as never);
    if (result.status === "complete") return go(result.createdSessionId, setSignInActive);
    throw new Error("Code incorrect ou expiré.");
  };
  const title = mode === "signup" || mode === "signup-code" ? "Créer votre compte" : mode === "reset" ? "Nouveau mot de passe" : mode === "reset-request" ? "Réinitialiser le mot de passe" : "Bienvenue sur BâtiRe";
  const subtitle = mode === "signup" ? "Créez votre espace en quelques instants." : mode === "reset" ? "Saisissez le code reçu et choisissez un nouveau mot de passe." : mode === "reset-request" ? "Nous vous enverrons un code de réinitialisation." : mode === "code" || mode === "signup-code" || mode === "mfa" ? "Saisissez le code de sécurité envoyé par Clerk." : "Connectez-vous pour suivre vos demandes et vos commandes.";
  const needsCode = mode === "code" || mode === "signup-code" || mode === "mfa";
  const signUpMode = mode === "signup";
  return <main className="auth-switch-page"><section className={`auth-switch-container ${signUpMode ? "sign-up-mode" : ""}`}>
    <div className="auth-switch-form">
    <Link to="/" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900"><ArrowLeft className="h-4 w-4" /> Retour à la boutique</Link>
    <img src="/batire-logo.jpg" alt="BâtiRe" className="mb-6 h-16 w-auto object-contain" />
    <h1 className="text-3xl font-black tracking-tight text-zinc-950">{title}</h1><p className="mt-2 text-sm text-zinc-600">{subtitle}</p>
    <form className="mt-7 space-y-4" onSubmit={run(needsCode ? mode === "signup-code" ? completeSignup : mode === "mfa" ? completeMfa : completeLoginCode : mode === "reset-request" ? resetPassword : mode === "reset" ? completeReset : mode === "signup" ? createAccount : loginWithPassword)}>
      {mode === "signup" ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Prénom" value={firstName} onChange={setFirstName} /><Field label="Nom" value={lastName} onChange={setLastName} /></div> : null}
      {!needsCode && mode !== "reset" ? <Field label="Adresse email" value={email} onChange={setEmail} type="email" icon={<Mail className="h-4 w-4" />} /> : null}
      {(mode === "signin" || mode === "signup") ? <Field label="Mot de passe" value={password} onChange={setPassword} type="password" icon={<LockKeyhole className="h-4 w-4" />} /> : null}
      {needsCode || mode === "reset" ? <Field label="Code de confirmation" value={code} onChange={setCode} inputMode="numeric" icon={<KeyRound className="h-4 w-4" />} /> : null}
      {mode === "reset" ? <Field label="Nouveau mot de passe" value={newPassword} onChange={setNewPassword} type="password" icon={<LockKeyhole className="h-4 w-4" />} /> : null}
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
      <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}{needsCode || mode === "reset" ? "Confirmer" : mode === "reset-request" ? "Envoyer le code" : mode === "signup" ? "Créer mon compte" : "Se connecter"}</button>
    </form>
    {mode === "signin" ? <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm font-semibold text-brand-700"><button onClick={() => void sendLoginCode()} disabled={!email || busy}>Recevoir un code de connexion</button><button onClick={() => { setMode("reset-request"); setError(null); }}>Mot de passe oublié ?</button><button onClick={() => { setMode("signup"); setError(null); }}>Créer un compte</button></div> : null}
    {mode === "signup" ? <p className="mt-5 text-center text-sm text-zinc-600">Déjà un compte ? <button className="font-semibold text-brand-700" onClick={() => setMode("signin")}>Se connecter</button></p> : null}
    </div>
    <aside className="auth-switch-panel">
      <img src="/batire-logo.jpg" alt="" className="h-20 w-auto brightness-0 invert" />
      <h2>{signUpMode ? "Déjà membre ?" : "Nouveau ici ?"}</h2>
      <p>{signUpMode ? "Retrouvez votre espace BâtiRe et vos démarches en cours." : "Créez votre espace pour suivre vos commandes, dons et recherches."}</p>
      <button type="button" onClick={() => { setMode(signUpMode ? "signin" : "signup"); setError(null); }}>
        {signUpMode ? "Se connecter" : "Créer un compte"}
      </button>
    </aside>
  </section></main>;
}

function Field({ label, value, onChange, type = "text", inputMode, icon }: { label: string; value: string; onChange: (value: string) => void; type?: string; inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"]; icon?: ReactNode }) {
  return <label className="block text-sm font-semibold text-zinc-800"><span>{label}</span><span className="relative mt-1.5 block">{icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-600">{icon}</span> : null}<input required value={value} type={type} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} className={`h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 ${icon ? "pl-10" : ""}`} /></span></label>;
}

export default AuthSwitch;
