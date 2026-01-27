# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Starwizz is an Angular 20+ application that creates animated starfield simulations with a galaxy background. It allows users to upload images, customize star animation parameters, and record the simulation as video.

**Live Demo**: https://sidthesloth92.github.io/starwizz/

## Common Commands

### Development

```bash
ng serve              # Start dev server at http://localhost:4200/
npm start             # Alias for ng serve
```

### Testing

```bash
ng test               # Run unit tests with Karma
ng test --no-watch --code-coverage  # Single run with coverage
```

### Build & Deployment

```bash
ng build              # Production build to dist/
npm run deploy        # Build and deploy to GitHub Pages
```

### Code Generation

```bash
ng generate component component-name
ng generate service service-name
ng generate --help    # See all available schematics
```

## Architecture

### State Management Pattern

The application uses Angular's **signal-based state management** (Angular 20+) instead of traditional RxJS observables. All state is centralized in `SimulationService` (src/app/services/simulation.service.ts):

- **Controls**: Config-driven simulation parameters stored as `WritableSignal<number>` in a typed record
- **UI State**: Recording state, loading progress, image state
- **Computed State**: Canvas dimensions derived from selected aspect ratio

Components inject `SimulationService` and access state via signal getters (`signal()`) or effects (`effect()`).

### Component Hierarchy

```
App (sw-root)
├── HeaderComponent
├── Simulator (sw-simulator)
│   └── Canvas-based rendering & recording
└── ControlPanel (sw-control-panel)
    └── User controls for simulation parameters
```

### Simulator Component Architecture

The `Simulator` component (src/app/components/simulator/simulator.ts) is the core rendering engine:

1. **Canvas Rendering**: Uses native Canvas 2D API for hardware-accelerated drawing
2. **Star System**: Two types of stars with object pooling for performance
   - Stars (1000): Slow-moving background layer
   - Shooting stars (10): Fast-moving foreground with trails, spawned from a reusable pool
3. **Animation Loop**: RequestAnimationFrame-based loop at 60 FPS
4. **Recording**: MediaRecorder API captures canvas stream, handles browser-specific codecs
5. **Async Star Generation**: Stars generated in batches (50 at a time) to avoid blocking UI

### Star Models

Both star types (`Star`, `ShootingStar`) in src/app/models/:

- Inject `SimulationService` for accessing control values
- Implement `update()` for position/state changes
- Implement `draw()` for canvas rendering with shared star texture

### Key Design Patterns

1. **Config-Driven Controls**: `CONTROLS` constant (src/app/constants/simulation.constant.ts) defines all slider metadata (min, max, step, initial, precision). Single source of truth for control configuration.

2. **Responsive Canvas**: Canvas uses fixed high-resolution dimensions (1080x1920) for consistent video output regardless of viewport size. Aspect ratio can be changed via dropdown.

3. **Object Pooling**: Shooting stars are pre-allocated and reused (spawn/deactivate cycle) to avoid garbage collection during animation.

4. **Effect-Based Reactivity**: `Simulator` uses Angular effects to respond to:
   - Recording state changes → start/stop MediaRecorder
   - Aspect ratio changes → reset canvas dimensions and regenerate stars

## Styling

- **Tailwind CSS 4.x**: Configured with custom neon-pink colors
- **Component Styles**: Each component has a co-located CSS file
- **Prettier**: Auto-formats with 100 char width, single quotes, Angular HTML parser

## Component Prefix

All components use the `sw` selector prefix (configured in angular.json).

## Important Implementation Notes

- The simulator uses a zoom loop: scales from 1.0 to 2.5, then resets to create infinite zoom effect
- Recording auto-stops at 30 seconds (MAX_RECORDING_SECONDS constant)
- Star texture is a pre-generated radial gradient canvas used as a sprite for performance
- Default galaxy image loads on startup to showcase the tool immediately
- Browser compatibility: Prefers MP4 codec but falls back to WebM for video recording
