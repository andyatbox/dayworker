/**
 * "Joined" means either path counts, once per person:
 *
 * - signed up on the landing page (`registrations`), or
 * - went straight to the app and was matched later from the app's user export
 *   (`app_account` events with via = 'app')
 *
 * Page sign-ups who later finish in the app aren't counted twice; they show as
 * `in_app` (via = 'page') instead.
 *
 * `campaign` is a SQL expression for the campaign id (`c.id`, `$1`), never user input.
 */
export const joinedSql = (campaign: string) => `(select count(*)::int from (
    select contact_id from registrations where campaign_id = ${campaign} and contact_id is not null
    union
    select contact_id from events where campaign_id = ${campaign} and type = 'app_account' and meta->>'via' = 'app'
  ) joined)`;

export const joinedPageSql = (campaign: string) =>
  `(select count(distinct contact_id)::int from registrations where campaign_id = ${campaign})`;

export const joinedAppSql = (campaign: string) =>
  `(select count(distinct contact_id)::int from events where campaign_id = ${campaign} and type = 'app_account' and meta->>'via' = 'app')`;

/** Everyone credited to the campaign who now has an app account, whichever way they came in. */
export const inAppSql = (campaign: string) =>
  `(select count(distinct contact_id)::int from events where campaign_id = ${campaign} and type = 'app_account')`;
