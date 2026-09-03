import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { frFR } from "@clerk/localizations";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import App from "./App";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const root = createRoot(document.getElementById("root")!);

if (!convexUrl || !clerkKey) {
  // Sans ces clés l'app ne peut rien afficher : on explique plutôt que de
  // planter sur un écran blanc.
  root.render(
    <StrictMode>
      <div style={{ fontFamily: "system-ui", padding: 40, maxWidth: 640 }}>
        <h1>Configuration incomplète</h1>
        <p>
          Renseignez <code>VITE_CONVEX_URL</code> et <code>VITE_CLERK_PUBLISHABLE_KEY</code> dans
          les variables d'environnement du déploiement, puis rechargez.
        </p>
      </div>
    </StrictMode>,
  );
} else {
  const convex = new ConvexReactClient(convexUrl);
  root.render(
    <StrictMode>
      <ClerkProvider
        publishableKey={clerkKey}
        localization={frFR}
        signInUrl="/connexion"
        signUpUrl="/inscription"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        appearance={{ variables: { colorPrimary: "#2795b3" } }}
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </StrictMode>,
  );
}
