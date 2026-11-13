// Makes a demo invite link: what a contractor's email links to, with their
// details filled in on arrival, without making the invite in /blast first.
//
//   APP_SECRET=… node scripts/demo-link.mjs "First" "Last" "Business" email [es] [site]
//
// APP_SECRET must be the live site's (it's in .env.vercel), or the link won't
// open the invitation.
import { createHmac } from "node:crypto";

const [first, last, business, email, lang = "en", site = "https://www.dayworker.co"] = process.argv.slice(2);
const secret = process.env.APP_SECRET;
if (!secret || !email) {
  console.error('Usage: APP_SECRET=… node scripts/demo-link.mjs "First" "Last" "Business" email [en|es] [site]');
  process.exit(1);
}
const value = `d~${Buffer.from(JSON.stringify({ f: first, l: last, b: business, e: email, g: lang })).toString("base64url")}`;
const mac = createHmac("sha256", secret).update(value).digest("base64url");
console.log(`${site}/i/${value}.${mac}`);
