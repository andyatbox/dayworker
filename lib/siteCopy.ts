import type { Lang } from "./copy";

/**
 * The home page's own words, in English and Spanish. The sign-up layer's copy
 * (invitation, panel, form, buttons) lives in copy.ts; trade names there too.
 * Spanish uses "usted" throughout, matching the sign-up layer and the emails.
 */
const en = {
  meta: {
    title: "Dayworker — The Blue-Collar Pro Network",
    description:
      "Dayworker connects contractors with skilled workers, on demand. No middlemen. No hiring fees. Build your free profile — available online and on iOS and Android.",
    ogDescription: "Contractors and skilled workers, connected on demand. No middlemen. No hiring fees.",
  },
  toggle: { label: "Language", en: "English", es: "Español" },
  hero: {
    /** The tagline as one line, and as the two stacked boxes. */
    tagline: "The blue-collar pro network.",
    lines: ["The blue-collar", "pro network."],
    /** A narrower break, for screens too slim for those lines (none needed). */
    narrowLines: [] as string[],
    /** "Dayworker Video", folding to "Video" once parked: the part before
     *  and after "Video" that folds away. */
    videoLead: "Dayworker ",
    video: "Video",
    videoTail: "",
    videoDialog: "Dayworker video",
    closeVideo: "Close video",
    home: "Dayworker home",
  },
  intro: {
    eyebrow: "A revolution",
    headline: "Dayworker connects skilled on-demand workers with local jobs.",
    sub: "Worker professional profile.",
    body: "Dayworkers create their profile, show off skills and experience, and apply to local jobs. Interested contractors reach out privately using our live-translated messenger.",
    workersFree: "Apply to jobs for free, for life.",
    postsEyebrow: "Job posts",
    postsTitle: "Post jobs to build your crew and on-board last-minute support.",
    postsBody: "Qualified workers apply to jobs, and get listed as applicants. Message approved workers and get the job done.",
    /** Before the underlined part, the underlined part, after it; the † follows. */
    postsFree: [
      "We’re not a recruiter. No middlemen or hiring fees, ever. ",
      "Free job postings",
      " for a limited time!",
    ] as [string, string, string],
  },
  features: {
    label: "Features",
    autoplay: "Auto-play",
    items: [
      {
        tab: "Job Search",
        tag: "Workers",
        title: "Job search",
        body: "Workers search and apply for jobs that meet qualifications and skill set.",
        alt: "Dayworker job search: a map of nearby jobs, each marked with its trade",
      },
      {
        tab: "Worker Search",
        tag: "Contractors",
        title: "Worker search",
        body: "Contractors search for qualified workers based on location, skills, and qualifications, then message them directly.",
        alt: "Dayworker worker search: a map of available workers across New York City",
      },
      {
        tab: "Job Posts",
        tag: "Contractors",
        title: "Job posts & applicants",
        body: "Post a job and set application requirements. Vet your applicants through the messenger, and give your stamp of approval when it works.",
        alt: "A Dayworker job post for painters in Ridgewood, with pay, skills and an Apply button",
      },
      {
        tab: "Dash",
        tag: "Networking",
        title: "Dashboard",
        body: "Your command post for contacts, managing job postings or applications, and building your professional network.",
        alt: "The Dayworker dashboard, showing a contractor's saved jobs",
      },
      {
        tab: "Badges",
        tag: "Workers",
        title: "Achievement badges",
        body: "Earn badges as you work and boost your profile. Big earners appear more reliable and professional to interested contractors.",
        alt: "A worker's Dayworker profile with achievement badges and skills",
      },
      {
        tab: "Messenger",
        tag: "Networking",
        title: "Live-translated messenger",
        body: "Our private messenger is your link to professional success. Use it for networking and at the job site for communication in multiple spoken languages.",
        alt: "A conversation in the Dayworker messenger, setting up a job for the next morning",
      },
    ],
  },
  cta: {
    eyebrow: "Let’s get to work",
    headline: "Sign up and post or apply for jobs today.",
    getStarted: "Get started",
    shots: [
      "Carpenters framing a house",
      "Crew raising a building frame",
      "Carpenter cutting lumber on site",
      "Crew on a rural build",
      "Electrician wiring a panel",
      "Crew laying paving stones",
      "Mechanic working on a build",
    ],
  },
  footer: {
    socials: "Join us on the socials at",
    contact: "Contact us at",
    dagger:
      "†Connecting with workers is free for a limited time. As of March of 2027, messaging workers will require a monthly subscription.",
    rights: "© 2026 Dayworker, Inc. All Rights Reserved.",
    terms: "Terms",
    privacy: "Privacy",
    close: "Close",
  },
};

export type SiteCopy = typeof en;

const es: SiteCopy = {
  meta: {
    title: "Dayworker — La red profesional de oficios",
    description:
      "Dayworker conecta a contratistas con trabajadores calificados, cuando los necesitan. Sin intermediarios. Sin comisiones de contratación. Cree su perfil gratis — disponible en línea y en iOS y Android.",
    ogDescription:
      "Contratistas y trabajadores calificados, conectados cuando se necesitan. Sin intermediarios. Sin comisiones de contratación.",
  },
  toggle: { label: "Idioma", en: "English", es: "Español" },
  hero: {
    tagline: "La red profesional de oficios.",
    lines: ["La red profesional", "de oficios."],
    narrowLines: ["La red", "profesional", "de oficios."],
    videoLead: "",
    video: "Video",
    videoTail: " de Dayworker",
    videoDialog: "Video de Dayworker",
    closeVideo: "Cerrar video",
    home: "Inicio de Dayworker",
  },
  intro: {
    eyebrow: "Una revolución",
    headline: "Dayworker conecta a trabajadores calificados a demanda con trabajos locales.",
    sub: "Perfil profesional del trabajador.",
    body: "Los trabajadores crean su perfil, muestran sus habilidades y experiencia, y se postulan a trabajos locales. Los contratistas interesados se comunican en privado con nuestra mensajería con traducción en vivo.",
    workersFree: "Postúlese a trabajos gratis, de por vida.",
    postsEyebrow: "Publicar trabajos",
    postsTitle: "Publique trabajos para formar su cuadrilla y conseguir apoyo de último minuto.",
    postsBody:
      "Los trabajadores calificados se postulan a los trabajos y aparecen como postulantes. Escriba a los trabajadores aprobados y saque el trabajo adelante.",
    postsFree: [
      "No somos una agencia de reclutamiento. Sin intermediarios ni comisiones de contratación, nunca. ¡",
      "Publicaciones de trabajo gratis",
      " por tiempo limitado!",
    ],
  },
  features: {
    label: "Funciones",
    autoplay: "Reproducción automática",
    items: [
      {
        tab: "Buscar trabajo",
        tag: "Trabajadores",
        title: "Búsqueda de trabajo",
        body: "Los trabajadores buscan trabajos que se ajusten a sus calificaciones y habilidades, y se postulan.",
        alt: "Búsqueda de trabajo en Dayworker: un mapa de trabajos cercanos, cada uno marcado con su oficio",
      },
      {
        tab: "Buscar trabajadores",
        tag: "Contratistas",
        title: "Búsqueda de trabajadores",
        body: "Los contratistas buscan trabajadores calificados según su ubicación, habilidades y calificaciones, y les escriben directamente.",
        alt: "Búsqueda de trabajadores en Dayworker: un mapa de trabajadores disponibles en la ciudad de Nueva York",
      },
      {
        tab: "Publicaciones",
        tag: "Contratistas",
        title: "Publicaciones y postulantes",
        body: "Publique un trabajo y fije los requisitos para postularse. Evalúe a sus postulantes por el chat y deles su aprobación cuando le convenzan.",
        alt: "Una publicación de Dayworker para pintores en Ridgewood, con pago, habilidades y un botón para postularse",
      },
      {
        tab: "Panel",
        tag: "Red de contactos",
        title: "Panel de control",
        body: "Su centro de mando para sus contactos, para administrar publicaciones o postulaciones, y para crecer su red profesional.",
        alt: "El panel de Dayworker, con los trabajos guardados de un contratista",
      },
      {
        tab: "Insignias",
        tag: "Trabajadores",
        title: "Insignias de logros",
        body: "Gane insignias mientras trabaja y mejore su perfil. Quienes tienen más se ven más confiables y profesionales ante los contratistas interesados.",
        alt: "El perfil de un trabajador en Dayworker, con insignias de logros y habilidades",
      },
      {
        tab: "Mensajería",
        tag: "Red de contactos",
        title: "Mensajería con traducción en vivo",
        body: "Nuestra mensajería privada es su enlace al éxito profesional. Úsela para hacer contactos y en la obra para comunicarse en varios idiomas.",
        alt: "Una conversación en la mensajería de Dayworker, acordando un trabajo para la mañana siguiente",
      },
    ],
  },
  cta: {
    eyebrow: "Manos a la obra",
    headline: "Regístrese y publique o postúlese a trabajos hoy mismo.",
    getStarted: "Comenzar",
    shots: [
      "Carpinteros armando la estructura de una casa",
      "Cuadrilla levantando la estructura de un edificio",
      "Carpintero cortando madera en la obra",
      "Cuadrilla en una obra en el campo",
      "Electricista cableando un tablero",
      "Cuadrilla colocando adoquines",
      "Mecánico trabajando en una obra",
    ],
  },
  footer: {
    socials: "Síganos en redes sociales",
    contact: "Contáctenos en",
    dagger:
      "†Conectar con trabajadores es gratis por tiempo limitado. A partir de marzo de 2027, enviar mensajes a trabajadores requerirá una suscripción mensual.",
    rights: "© 2026 Dayworker, Inc. Todos los derechos reservados.",
    terms: "Términos",
    privacy: "Privacidad",
    close: "Cerrar",
  },
};

export const siteCopy: Record<Lang, SiteCopy> = { en, es };
