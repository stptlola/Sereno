// Messages clairs, en français, pour les erreurs d'authentification (M0-14).
const MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: "Vous avez déjà un compte avec cette adresse : connectez-vous, ou réinitialisez votre mot de passe.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Vous avez déjà un compte avec cette adresse : connectez-vous, ou réinitialisez votre mot de passe.",
  INVALID_EMAIL_OR_PASSWORD: "L’adresse e-mail ou le mot de passe ne correspondent pas.",
  INVALID_EMAIL: "Cette adresse e-mail ne semble pas valide.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit faire au moins 8 caractères.",
  PASSWORD_TOO_LONG: "Ce mot de passe est trop long.",
  INVALID_TOKEN: "Ce lien n’est plus valable. Demandez-en un nouveau.",
  EMAIL_NOT_VERIFIED: "Confirmez d’abord votre adresse e-mail grâce au lien reçu.",
};

export function messageErreur(code: string | undefined, repli = "Une erreur est survenue. Réessayez dans un instant."): string {
  return (code && MESSAGES[code]) || repli;
}
