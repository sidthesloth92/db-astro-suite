# AstroCard

AstroCard is an exposure card generator for astrophotographers. It helps you create beautiful, Instagram-ready cards (4:5 and 9:16 aspect ratios) detailing your equipment and integration times.

## Features

- **Glassmorphism Design**: Minimalist and modern UI with neon accents.
- **Exposure Details**: Input integration times for L, Ha, OIII, SII, R, G, B filters.
- **Visualization**: Generates circular progress rings based on integration time.
- **Equipment & Software**: List your telescope, camera, mount, and software used.
- **Bortle Scale**: Gradient slider to indicate sky quality.
- **Customization**:
  - Upload your own blurred background image.
  - Choose custom accent colors.
  - Switch between Portrait (4:5) and Story (9:16) formats.
- **Export**: Download high-quality PNGs directly from the app.

## Development

Run the development server:

```bash
pnpm dev:astrocard
```

Navigate to `http://localhost:4201/db-astro-suite/astrocard`.

## Build

Build the project:

```bash
pnpm build:astrocard
```

The build artifacts will be stored in the `dist/` directory.
