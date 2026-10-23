// Exécuté une fois au démarrage du serveur : on vérifie la configuration tout de suite,
// pour qu'un oubli de variable arrête le conteneur avec un message clair (visible dans Coolify).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("./lib/env");
    try {
      env();
    } catch (erreur) {
      console.error(erreur instanceof Error ? erreur.message : erreur);
      process.exit(1);
    }
  }
}
