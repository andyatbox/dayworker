import { q, one } from "./db";
import { SENDABLE, whereFor, type Filter } from "./segments";
import type { Step } from "./mail/render";

/**
 * Queues step 1 for every sendable contact in the campaign's list, best fit
 * first. `limit` lets a pilot start small (e.g. 200) before the whole list.
 */
export async function enroll(campaignId: number, limit?: number) {
  const c = await one<{ filter: Filter | null }>(
    `select l.filter from campaigns c left join lists l on l.id = c.list_id where c.id = $1`,
    [campaignId],
  );
  if (!c?.filter) throw new Error("Pick a list for this campaign first.");
  const params: unknown[] = [campaignId];
  const where = whereFor(c.filter, params);
  params.push(limit ?? 1_000_000);
  const rows = await q<{ id: number }>(
    `insert into sends (campaign_id, contact_id, step, token, due_at)
     select $1, c.id, 0, substr(md5(random()::text || c.id::text || clock_timestamp()::text), 1, 16), now()
     from contacts c
     where ${where} and ${SENDABLE}
     order by c.fit_score desc, c.id
     limit $${params.length}
     on conflict do nothing
     returning id`,
    params,
  );
  return rows.length;
}

export async function sendableCount(filter: Filter) {
  const params: unknown[] = [];
  const where = whereFor(filter, params);
  const r = await one<{ total: number; sendable: number }>(
    `select count(*)::int as total, count(*) filter (where ${SENDABLE})::int as sendable from contacts c where ${where}`,
    params,
  );
  return r ?? { total: 0, sendable: 0 };
}

/**
 * Starter sequence for NYC contractors. Plain text, short, from a person.
 * The first touch asks for a reply rather than a click — replies build sender
 * reputation, and a link-free first email looks least like a blast.
 */
export const STARTER_STEPS: Step[] = [
  {
    delay_days: 0,
    subject: "workers for {{business_name|your next job}}",
    body: `Hi {{first_name|there}},

I'm {{sender_first}} with Dayworker — we built an app where contractors find skilled local workers and message them directly. No staffing agency, no hiring fees.

I'd like to personally invite {{business_name|you}} to join as a Founding Member. Connecting with workers is free right now, and when connections become a paid membership (early 2027, date TBD), Founding Members get 3 more months of free worker connections. I'm only sending this to licensed contractors in the area.

Want me to send over your invite? Just reply "yes".`,
    subject_es: "trabajadores para {{business_name|su próximo trabajo}}",
    body_es: `Hola {{first_name}},

Soy {{sender_first}} de Dayworker. Creamos una app donde los contratistas encuentran trabajadores calificados de su zona y les escriben directamente. Sin agencias, sin comisiones.

Quiero invitar personalmente a {{business_name|su empresa}} a unirse como Miembro Fundador. Hoy conectar con trabajadores es gratis, y cuando las conexiones pasen a ser una membresía de pago (a principios de 2027, fecha por confirmar), los Miembros Fundadores reciben 3 meses más de conexiones gratis. Solo lo estoy enviando a contratistas con licencia de la zona.

¿Le mando su invitación? Responda "sí".`,
  },
  {
    delay_days: 3,
    subject: "",
    body: `{{first_name|Hi}} — here's your invite, in case it's easier to just look:

{{invite_link}}

Post a job, workers near your site apply, you message them and pick. The messenger translates English and Spanish live, so the whole crew can talk.

{{sender_first}}`,
    subject_es: "",
    body_es: `{{first_name|Hola}}, aquí está su invitación por si prefiere verla directamente:

{{invite_link}}

Publica un trabajo, los trabajadores cerca de su obra se postulan, les escribe y elige. El chat traduce inglés y español en vivo.

{{sender_first}}`,
  },
  {
    delay_days: 5,
    subject: "",
    body: `Last note from me. Connections on Dayworker become a paid membership in early 2027 (date TBD). Founding Members who join before then get 3 free months of worker connections after that.

If last-minute help or no-shows are ever a headache, this is the fix:
{{invite_link}}

If it's not a fit, no worries — I won't follow up again.

{{sender_first}}`,
    subject_es: "",
    body_es: `Última nota de mi parte. Las conexiones en Dayworker pasan a ser una membresía de pago a principios de 2027 (fecha por confirmar). Los Miembros Fundadores que se unan antes reciben 3 meses gratis de conexiones con trabajadores después de eso.

Si alguna vez le falta gente a última hora, esta es la solución:
{{invite_link}}

Si no le sirve, no hay problema, no le vuelvo a escribir.

{{sender_first}}`,
  },
];

/**
 * One branded email (header image, buttons) for warmer sends and tests. A line
 * that is only [Label](link) becomes a button; the first is the main one.
 */
export const BRANDED_STEPS: Step[] = [
  {
    delay_days: 0,
    subject: "{{first_name|You}}, you're invited to Dayworker",
    body: `Hi {{first_name|there}},

I'm {{sender_first}} with Dayworker, the blue-collar pro network. Contractors use it to find skilled local workers and message them directly. No staffing agency, no hiring fees.

I'd like to personally invite {{business_name|you}} to join as a Founding Member. Connecting with workers is free right now, and when connections become a paid membership (early 2027, date TBD), Founding Members get 3 more months of free worker connections.

[Accept invitation at dayworker.co]({{invite_link}})

Rather do it from your phone? Download the app and sign up there.

[Download the app]({{app_link}})`,
    subject_es: "{{first_name|Usted}}, está invitado a Dayworker",
    body_es: `Hola {{first_name}},

Soy {{sender_first}} de Dayworker, la red de profesionales de oficio. Los contratistas la usan para encontrar trabajadores calificados de su zona y escribirles directamente. Sin agencias, sin comisiones.

Quiero invitar personalmente a {{business_name|su empresa}} a unirse como Miembro Fundador. Hoy conectar con trabajadores es gratis, y cuando las conexiones pasen a ser una membresía de pago (a principios de 2027, fecha por confirmar), los Miembros Fundadores reciben 3 meses más de conexiones gratis.

[Aceptar invitación en dayworker.co]({{invite_link}})

¿Prefiere hacerlo desde el teléfono? Descargue la app y regístrese ahí.

[Descargar la app]({{app_link}})`,
  },
];
