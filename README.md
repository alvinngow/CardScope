# CardScope

CardScope is a self-hosted React and Next.js app for importing monthly credit card statements into Postgres and reviewing spend by month, category, merchant, and transaction.

## Statement formats

CardScope accepts CSV, TSV, plain text, and text-based PDF statements. CSV exports are the most reliable because issuers use different PDF layouts. Scanned image-only PDFs need OCR before import.

Expected CSV columns can use common names such as `date`, `transaction date`, `description`, `merchant`, `amount`, `debit`, `credit`, or `category`.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set `DATABASE_URL` in `.env` before importing real statements:

```bash
DATABASE_URL=postgres://cardscope:change-me@localhost:5432/cardscope
```

The app creates its tables automatically on first database use. The same schema is also available in `db/schema.sql`.

## Statement import flow

CardScope parses the uploaded statement first, then sends any rule-uncategorized positive spending merchants to DeepSeek for categorization. DeepSeek can reuse existing categories or create a new broad category when the current list does not fit the vendor.

```bash
DEEPSEEK_API_KEY=your-deepseek-key
DEEPSEEK_CATEGORIZATION_ENABLED=true
DEEPSEEK_CATEGORIZATION_MODEL=deepseek-v4-flash
```

If `DEEPSEEK_API_KEY` is blank, imports still work, but unknown merchants stay in `Other` with an import warning.

## Raspberry Pi deployment

### With an existing Postgres server

Create a new database in your Postgres instance:

```bash
createdb cardscope
```

Then configure and run the app:

```bash
cp .env.example .env
npm ci
npm run build
npm start
```

Open `http://<raspberry-pi-hostname>:3000`.

### With Docker Compose

```bash
docker compose up -d --build
```

The compose file starts CardScope and a separate `cardscope` Postgres database with a persistent Docker volume. Change the default Postgres password before using it for real financial data.

## Privacy note

Statement data is parsed and stored by your own running instance. During categorization, CardScope sends only unknown merchant names, amounts, and redacted transaction snippets to DeepSeek.
