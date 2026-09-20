# Kala Web

Kala Web is a React + Vite application for a creative talent marketplace and opportunity discovery platform. It connects artists, organisers, and opportunity seekers through a polished portal experience with profile views, application flows, opportunities browsing, and Supabase-backed authentication.

## Features

- Artist and organiser portal experiences
- Opportunity discovery and browsing
- Featured calls and curated listings
- Application and onboarding flows
- Profile management UI
- Supabase authentication and account flows
- Cloudinary-ready media uploads
- Responsive, modern interface built with React and Tailwind

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- Cloudinary
- Lucide icons

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm

### Install dependencies

```bash
npm install
```

### Environment variables

Copy [.env.example](.env.example) to a local `.env` file and fill in the required values:

```bash
copy .env.example .env
```

Then configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

### Run locally

```bash
npm run dev
```

The app will start on:

- http://localhost:3000/

## Build

```bash
npm run build
```

## Project Structure

```text
src/
  components/
  data/
  lib/
  App.tsx
  main.tsx
  types.ts
```

## Notes

This project is configured for local development and deployment in a standard Vite environment. For production setup, ensure your Supabase and Cloudinary environment values are configured securely and not committed to source control.
