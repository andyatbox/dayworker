/**
 * Copy for the sign-up layer on dayworker.co: the personal invitation that
 * pops up for people arriving from an email, the sign-up panel, and its form.
 * English and Spanish, following the page's language (see components/Lang);
 * an invitation link opens the page in the contact's language. The page's own
 * sections are in siteCopy.ts.
 *
 * The Founding Member offer: connecting with workers is free until March of
 * 2027, then a monthly subscription; Founding Members get 3 extra free months.
 */
export type Lang = "en" | "es";

/** Trade keys are stored in English; labels follow the page language. */
export const TRADES: { key: string; icon: string; es: string }[] = [
  { key: "General Labor", icon: "general-laborer", es: "Mano de obra general" },
  { key: "Carpentry", icon: "carpenter", es: "Carpintería" },
  { key: "Cleaning", icon: "cleaningandhousekeeping", es: "Limpieza" },
  { key: "Concrete", icon: "concrete", es: "Concreto" },
  { key: "Demolition", icon: "excavation", es: "Demolición" },
  { key: "Diesel Mechanic", icon: "diesel-mechanic", es: "Mecánica diésel" },
  { key: "Drywall", icon: "drywaller", es: "Drywall / Tablaroca" },
  { key: "Electrical", icon: "electrician", es: "Electricidad" },
  { key: "Excavation", icon: "excavation", es: "Excavación" },
  { key: "Flooring and Tiling", icon: "tile-setter", es: "Pisos y azulejos" },
  { key: "Framing", icon: "framing", es: "Estructuras (framing)" },
  { key: "Heavy Equipment Operator", icon: "heavyequipmentoperator", es: "Operador de equipo pesado" },
  { key: "HVAC", icon: "hvac-technician", es: "HVAC / Climatización" },
  { key: "Landscaping", icon: "landscaper", es: "Jardinería" },
  { key: "Machining", icon: "machinist", es: "Maquinado" },
  { key: "Marine", icon: "marine", es: "Marina" },
  { key: "Masonry", icon: "bricklayer-masonry-worker", es: "Albañilería" },
  { key: "Mechanic", icon: "mechanic", es: "Mecánica" },
  { key: "Painting", icon: "painter", es: "Pintura" },
  { key: "Paving", icon: "paving", es: "Pavimentación" },
  { key: "Plumbing", icon: "plumber", es: "Plomería" },
  { key: "Roofing", icon: "roofing-contractor", es: "Techado" },
  { key: "Scaffolding", icon: "scaffolder", es: "Andamios" },
  { key: "Welding", icon: "welder", es: "Soldadura" },
];

export function tradeLabel(key: string, lang: Lang) {
  return lang === "es" ? (TRADES.find((t) => t.key === key)?.es ?? key) : key;
}

export const copy = {
  en: {
    invite: {
      eyebrow: "Personal invitation",
      title: (first: string) => (first ? `${first}, you're invited.` : "You're invited."),
      body: (business: string) =>
        `We're personally inviting ${business || "you"} to join Dayworker, the blue-collar pro network, as a Founding Member.`,
      offer:
        "Connecting with workers is free until March of 2027. Founding Members receive 3 additional free months, so sign up today!",
      later: "Look around first",
    },
    signup: {
      eyebrow: "Sign up",
      title: "Join Dayworker.",
      // Only hiring contractors will pay (to message workers); workers never do.
      subContractor: "Takes only a minute. Then log in to the app with this email and password to post jobs.",
      offerContractor:
        "Post jobs and connect with workers for free until March of 2027. As a Founding Member, you'll receive 3 additional free months.",
      subWorker:
        "Dayworker is free to workers for life. Signing up takes only a minute. When finished, log in to the app with this email and password, build your profile, and apply to jobs.",
    },
    cta: {
      app: "Get the app & sign up",
      appShort: "Get the app",
      signup: "Sign up now",
      signupShort: "Sign up",
      qr: "Scan to download the app and sign up on your phone",
      close: "Close",
      dialog: "Download the Dayworker app",
      qrAlt: "QR code linking to the Dayworker app",
    },
    form: {
      roleLabel: "I am a…",
      roleContractor: "Hiring contractor",
      roleWorker: "Worker",
      name: "Your name",
      business: "Business name",
      email: "Email",
      password: "Create a password",
      passwordHint: "At least 6 characters. You'll log in to the app with this email and password.",
      show: "Show",
      hide: "Hide",
      phone: "Mobile phone",
      optional: "optional",
      zip: "ZIP code where you work",
      tradesContractor: "Trades you hire for",
      tradesWorker: "Your trades",
      need: "When do you need workers?",
      needOptions: [
        ["now", "This week"],
        ["month", "This month"],
        ["season", "Next season"],
        ["exploring", "Just looking"],
      ] as [string, string][],
      lang: "Preferred language",
      consentEmail: "Email me about my account and new workers near me.",
      consentSms: "Text me about jobs and workers near me. Msg & data rates may apply. Reply STOP to opt out. Not required to join.",
      submit: "Sign up",
      sending: "Creating your account…",
      // [before the link, the link, after it]
      agreeTerms: ["I agree to Dayworker's ", "Terms", "."] as [string, string, string],
      agreePrivacy: ["I agree to Dayworker's ", "Privacy Policy", "."] as [string, string, string],
      errRequired: "Please fill in the highlighted fields.",
      errEmail: "That email doesn't look right.",
      errZip: "Enter a 5-digit ZIP code.",
      errZipNotFound: "We couldn't find that ZIP code. Check it and try again.",
      errZipLookup: "We couldn't check your ZIP code just now. Please try again in a minute.",
      errPassword: "Your password needs at least 6 characters.",
      errAgree: "Please agree to the Terms and the Privacy Policy to sign up.",
      errExists: "That email already has a Dayworker account. Log in to the app with it instead.",
      errNotReady: "Sign-up isn't connected yet. Get the app to sign up for now.",
      errServer: "Something went wrong. Please try again.",
    },
    success: {
      title: (first: string) => `You're in, ${first}.`,
      contractor: (email: string, founding: boolean) =>
        founding ? `You're a Founding Member. Your account is ${email}.` : `Your account is ready: ${email}.`,
      worker: (email: string) => `Your account is ready: ${email}. Dayworker is free for workers, for life.`,
      step1: "Get the app",
      step1b: "Log in with the email and password you just set. That's where you'll post jobs and message workers.",
      step1bWorker: "Log in with the email and password you just set, finish your profile, and start applying to local jobs.",
      step2: "Bring your crew",
      step2b: "Workers you invite join free, so they're ready when you post your next job.",
      step2bWorker: "Know someone who's looking for work? Send them your link.",
      copy: "Copy link",
      copied: "Copied!",
      whatsapp: "WhatsApp",
      text: "Text",
      shareMsg: "I'm on Dayworker, the network for contractors and skilled workers. Join free:",
    },
  },
  es: {
    invite: {
      eyebrow: "Invitación personal",
      title: (first: string) => (first ? `${first}, está invitado.` : "Está invitado."),
      body: (business: string) =>
        `${business ? `Invitamos personalmente a ${business}` : "Le invitamos personalmente"} a unirse a Dayworker, la red profesional de oficios, como Miembro Fundador.`,
      offer:
        "Conectar con trabajadores es gratis hasta marzo de 2027. Los Miembros Fundadores reciben 3 meses gratis adicionales, ¡así que regístrese hoy!",
      later: "Primero quiero ver el sitio",
    },
    signup: {
      eyebrow: "Regístrese",
      title: "Únase a Dayworker.",
      subContractor: "Toma solo un minuto. Después entre a la app con este correo y contraseña para publicar trabajos.",
      offerContractor:
        "Publique trabajos y conecte con trabajadores gratis hasta marzo de 2027. Como Miembro Fundador, recibirá 3 meses gratis adicionales.",
      subWorker:
        "Dayworker es gratis para los trabajadores, de por vida. Registrarse toma solo un minuto. Al terminar, entre a la app con este correo y contraseña, cree su perfil y postúlese a trabajos.",
    },
    cta: {
      app: "Descargar la app y registrarse",
      appShort: "Descargar la app",
      signup: "Regístrese ahora",
      signupShort: "Regístrese",
      qr: "Escanee para descargar la app y registrarse en su celular",
      close: "Cerrar",
      dialog: "Descargar la app de Dayworker",
      qrAlt: "Código QR que lleva a la app de Dayworker",
    },
    form: {
      roleLabel: "Soy…",
      roleContractor: "Contratista que contrata",
      roleWorker: "Trabajador",
      name: "Su nombre",
      business: "Nombre de la empresa",
      email: "Correo electrónico",
      password: "Cree una contraseña",
      passwordHint: "Mínimo 6 caracteres. Entrará a la app con este correo y contraseña.",
      show: "Mostrar",
      hide: "Ocultar",
      phone: "Celular",
      optional: "opcional",
      zip: "Código postal donde trabaja",
      tradesContractor: "Oficios que contrata",
      tradesWorker: "Sus oficios",
      need: "¿Cuándo necesita trabajadores?",
      needOptions: [
        ["now", "Esta semana"],
        ["month", "Este mes"],
        ["season", "La próxima temporada"],
        ["exploring", "Solo estoy viendo"],
      ] as [string, string][],
      lang: "Idioma preferido",
      consentEmail: "Envíenme correos sobre mi cuenta y nuevos trabajadores cerca de mí.",
      consentSms: "Envíenme mensajes de texto sobre trabajos y trabajadores cerca de mí. Pueden aplicar tarifas de mensajes y datos. Responda STOP para cancelar. No es obligatorio para unirse.",
      submit: "Registrarme",
      sending: "Creando su cuenta…",
      agreeTerms: ["Acepto los ", "Términos", " de Dayworker."] as [string, string, string],
      agreePrivacy: ["Acepto la ", "Política de Privacidad", " de Dayworker."] as [string, string, string],
      errRequired: "Complete los campos marcados.",
      errEmail: "Ese correo no parece correcto.",
      errZip: "Escriba un código postal de 5 dígitos.",
      errZipNotFound: "No encontramos ese código postal. Revíselo e intente de nuevo.",
      errZipLookup: "No pudimos verificar su código postal en este momento. Intente de nuevo en un minuto.",
      errPassword: "Su contraseña necesita al menos 6 caracteres.",
      errAgree: "Acepte los Términos y la Política de Privacidad para registrarse.",
      errExists: "Ese correo ya tiene una cuenta de Dayworker. Entre a la app con él.",
      errNotReady: "El registro aún no está conectado. Por ahora, regístrese en la app.",
      errServer: "Algo salió mal. Intente de nuevo.",
    },
    success: {
      title: (first: string) => `¡Listo, ${first}!`,
      contractor: (email: string, founding: boolean) =>
        founding ? `Ya es Miembro Fundador. Su cuenta es ${email}.` : `Su cuenta está lista: ${email}.`,
      worker: (email: string) => `Su cuenta está lista: ${email}. Dayworker es gratis para trabajadores, para siempre.`,
      step1: "Descargue la app",
      step1b: "Entre con el correo y la contraseña que acaba de crear. Ahí publicará trabajos y escribirá a los trabajadores.",
      step1bWorker: "Entre con el correo y la contraseña que acaba de crear, complete su perfil y empiece a postularse a trabajos locales.",
      step2: "Invite a su cuadrilla",
      step2b: "Los trabajadores que invite se unen gratis y estarán listos cuando publique su próximo trabajo.",
      step2bWorker: "¿Conoce a alguien que busca trabajo? Mándele su enlace.",
      copy: "Copiar enlace",
      copied: "¡Copiado!",
      whatsapp: "WhatsApp",
      text: "Mensaje",
      shareMsg: "Estoy en Dayworker, la red de contratistas y trabajadores de oficio. Únase gratis:",
    },
  },
};

export type Copy = (typeof copy)["en"];
