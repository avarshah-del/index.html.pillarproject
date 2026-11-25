# Brain HQ Hall of Fame Worker

This is the only backend for the site. It keeps the shared Master Agent list. It stores a codename and the date that name was added. It does not store real names, emails, ages, passwords, or points.

The website already points at:

`https://hall-of-fame.avarshah.workers.dev`

That address is set in one place: `hall-of-fame.js` in the site root. The board stays empty, and the pages show a friendly message, until this Worker is deployed from Ava's Cloudflare account.

The list is newest first. A name can only be on the board once.

## Deploy with Wrangler

1. Install Node.js on your computer if you don't have it.
2. Open a terminal in this folder (`workers/hall-of-fame`).
3. Log in to Cloudflare (this opens a browser window):

   ```bash
   npx wrangler login
   ```

4. Create the storage box the Worker uses:

   ```bash
   npx wrangler kv namespace create HALL
   ```

5. The command prints an id. Open `wrangler.toml` and replace `00000000000000000000000000000000` with that id. Leave the binding name as `HALL`.
6. Deploy:

   ```bash
   npx wrangler deploy
   ```

7. Wrangler prints the live URL. It should be `https://hall-of-fame.avarshah.workers.dev`. If Cloudflare gives you a different URL, change the one line in `hall-of-fame.js` to match, then update the GitHub Pages site.
8. Check it:

   ```bash
   curl https://hall-of-fame.avarshah.workers.dev
   ```

   You should see `{"entries":[]}`.

## Try it on your computer first

From this folder:

```bash
npx wrangler dev
```

Then in another terminal:

```bash
curl -i -X POST http://127.0.0.1:8787 \
  -H "Origin: http://localhost:8080" \
  -H "Content-Type: application/json" \
  -d '{"codename":"NOVA"}'

curl -i http://127.0.0.1:8787 -H "Origin: http://localhost:8080"
```

`node --test worker.test.mjs` checks the rules without Cloudflare.

## Deploy from the Cloudflare dashboard

1. Log in at https://dash.cloudflare.com.
2. Go to Workers & Pages, then Create, then start with Hello World and name the Worker `hall-of-fame`.
3. Replace the sample code with the contents of `worker.js`. The file already uses the `HALL` binding.
4. Create a KV namespace (Workers & Pages, then KV, then Create).
5. Open the Worker, then Settings, then Bindings, then Add KV namespace. Variable name: `HALL`. Pick the namespace you just made.
6. Deploy.
7. Confirm the workers.dev URL matches `hall-of-fame.js`.

## Rules the Worker enforces

- A codename is required. It can be 2 to 15 characters: letters, numbers, spaces, periods, apostrophes, and hyphens.
- A short blocked-word list rejects names that should not be on a kids' page.
- Each internet address can only add 20 names every 10 minutes. That slows junk without blocking a classroom that redeems together.
- Browsers on other websites cannot call it. `https://pillarproject.online` is allowed, and so is localhost for testing.
- Sending the same codename again does not create a second row.
- Points sent from a browser are ignored. Order is the date the name was added, newest at the top.
