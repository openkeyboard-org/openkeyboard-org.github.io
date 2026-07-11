# openkeyboard.org

Website for [openkeyboard.org](https://openkeyboard.org), built with [Astro](https://astro.build) 7.

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Type-check Astro files
npm run check

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

## 🏗️ Project Structure

```
/
├── public/          # Static assets (favicon, etc.)
├── src/
│   ├── layouts/     # Page layouts
│   └── pages/       # File-based routing (each .astro file = a page)
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## 🚢 Deployment

The site is automatically deployed to GitHub Pages on every push to `main` via the [Deploy workflow](.github/workflows/deploy.yml).

A [CI workflow](.github/workflows/ci.yml) runs on every push and pull request to validate types and confirm the site builds successfully.
