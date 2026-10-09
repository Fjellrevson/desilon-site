# desilon.nl

The Desilon studio site: one page for Evade with a tester sign-up, plus privacy, thanks and confirmed pages. Plain HTML and CSS, no build step, no cookies. The look follows Evade's design system (`Project Evade/docs/DESIGN_SYSTEM.md`): same palette, Fredoka, notched plates, hard shadows, no glow.

```
public/            everything that goes online (GitHub Pages serves this folder)
  tt/ ig/ yt/      short bio links: pass the source on to the home page (?utm_source=…), the form pre-fills it
  assets/          css, js, fonts, images
  .nojekyll        GitHub Pages serves the files as they are
.github/workflows/pages.yml   publishes public/ on every push to main
source/
  images.json      which screenshot feeds which image, and the card crops
  screenshots/     new screenshots from an Evade session go here
tools/
  serve.py         local preview that routes like GitHub Pages
  stage_shots.js   renders real Evade frames (see New screenshots)
  make_images.py   rebuilds the images in public/ from source/ and the Evade renders
  preview-mobile.html  the home page in a 390 px frame (copy into public/ to use, don't deploy it)
previews/          local preview PNGs (not in git)
```

## Preview locally

```
python tools/serve.py
```

Open http://localhost:8000. It routes like GitHub Pages: `/privacy`, `/thanks`, `/tt`, `/ig`, `/yt` and the 404 page work.

## Put it online (GitHub Pages, free; DNS stays at Strato)

Chosen 2026-10-09 because the DNS stays at Strato: Cloudflare Pages can only serve the bare domain (desilon.nl) when Cloudflare runs the DNS. Mail records (MX, SPF, DKIM, DMARC) are not touched.

1. Create a **public** GitHub repo (GitHub Pages is free for public repos) and push this folder.
2. Repo → Settings → Pages → Source: **GitHub Actions**. The workflow in `.github/workflows/pages.yml` publishes `public/` on every push to `main`; the first run puts the site on `<user>.github.io/<repo>`.
3. Settings → Pages → Custom domain: `desilon.nl` → Save. GitHub shows a DNS check.
4. In Strato (Domain → DNS settings), for `desilon.nl`:
   - Replace the A record of the bare domain with GitHub's four: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (and if Strato offers AAAA: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`).
   - Set `www` as a CNAME to `<user>.github.io`.
   - Leave MX and TXT records alone.
5. Wait until GitHub's DNS check is green (minutes to a day), then tick **Enforce HTTPS**. `www.desilon.nl` then forwards to `desilon.nl` by itself.
6. Optional, visit counts without cookies: Cloudflare dashboard → Web Analytics → add `desilon.nl` (works without Cloudflare DNS) → paste the snippet it gives just before `</body>` in each page in `public/`. The security policy in the pages already allows it.

## Connect the form (Zoho Campaigns)

The page has one sign-up form, `#hero-signup` in the hero (email only; the source is a hidden field). Until it's connected it shows "Sign-ups open in a few days" and send nothing.

1. Zoho Campaigns (EU account, zoho.eu) → Contacts → create the list **Evade testers**. Add a custom contact field **Source** (single line).
2. Sign-up forms → create a form for that list with the fields Email and Source (hidden). Settings:
   - **Double opt-in** on, with a short confirmation mail in our voice.
   - Redirect after sign-up: `https://desilon.nl/thanks`
   - Redirect after confirmation: `https://desilon.nl/confirmed`
3. Get the **embed / HTML code**. From it, copy into the form in `public/index.html`:
   - the form's `action` URL (replace `action="#"`);
   - all `<input type="hidden">` fields;
   - the field names Zoho uses for email and Source (e.g. `CONTACT_EMAIL`, `CONTACT_CF1`): put them in the `name` attributes (Source is a hidden field that `site.js` fills from `/tt`, `/ig`, `/yt`).
   Don't copy Zoho's own CSS or scripts; our styling stays. Consent is the line under the button plus the confirmation mail (double opt-in); there is no checkbox.
4. Set `data-connected="true"` on the form.
5. If the action URL is on another domain than `*.zoho.eu`, `*.zohopublic.eu` or `*.maillist-manage.eu`, add it to `form-action` in the `Content-Security-Policy` meta tag at the top of each page in `public/`.
6. Test: sign up from `desilon.nl/tt`, confirm the mail, check the contact in the list with Source = TikTok.

## Privacy page

`public/privacy.html` names the owner as the controller (filled in 2026-10-09; the AVG needs a name, and email counts as the contact detail, so no address). Once the VOF is registered, the controller becomes the VOF: its name, KvK number and business address replace the personal name. Check in Zoho that the account is in the EU data centre, and sign the data processing agreements of Zoho, GitHub and (if you use the visit counts) Cloudflare.

## New screenshots

The current screens are from build `pocb-2026-10-09b` (rendered 2026-10-09). To redo them:

1. `node tools/stage_shots.js <outdir> menu` and `node tools/stage_shots.js <outdir> run <startSec> <seconds> <seed> <sub> <module>` (Playwright from the Evade repo). It plays a temp copy of `evade.html` (invincible, autopilot, seeded) (optionally firing the module every `fireEvery` s) and saves frames while a module runs, while a sonar ping is fresh (its ring at 45, 60 and 75% of its reach) and just after every kill. It keeps only frames the sub would survive: no hit from 1 s before to 3 s after (owner, 2026-10-09). The game repo itself is never changed; stats go to a fake endpoint.
2. Pick frames by eye and save them (780 × 1600) in `source/screenshots/` as:

| File | Used for |
|---|---|
| `menu.png` | hero, back phone |
| `sonar.png` | hero, front phone |
| `dark.png` | card "Dodge in the dark" |
| `module.png` | card "Fire your module" (a module in action) |
| `collide.png` | card "Make them collide" |

3. Set each card's crop `box` in `source/images.json`, run `python tools/make_images.py` (needs Pillow), and update the `alt` texts in `public/index.html` if the scenes changed.

## Before launch

- [x] Privacy page: the owner's name filled in (2026-10-09)
- [ ] Form connected and tested end to end (sign-up, confirmation mail, thanks and confirmed pages)
- [ ] Mail to and from contact@desilon.nl still works after the DNS change
- [ ] desilon.nl and www work over https; /tt, /ig, /yt pre-fill the source
- [ ] Share preview checked (og-image) by pasting the link in a chat app
- [ ] Bio links on TikTok, Instagram and YouTube point to desilon.nl/tt, /ig, /yt

## Credits

Fredoka by Milena Brandão, SIL Open Font License 1.1 (self-hosted in `public/assets/fonts/`).
