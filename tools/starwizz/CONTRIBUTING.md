# Contributing to Starwizz

Thank you for your interest in contributing to Starwizz! We welcome contributions from the community and are grateful for any help you can provide.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Angular CLI (`npm install -g @angular/cli`)

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/sidthesloth92/db-astro-suite.git
   cd db-astro-suite/tools/starwizz
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Start the development server**:

   ```bash
   ng serve
   ```

   Open your browser to `http://localhost:4200/db-astro-suite/starwizz/`

5. **Run tests** to ensure everything works:
   ```bash
   ng test
   ```

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Browser and OS information
- Screenshots if applicable

### Suggesting Features

We love new ideas! When suggesting a feature:

- Check existing issues to avoid duplicates
- Describe the feature and its use case
- Explain why it would benefit users

### Submitting Pull Requests

1. **Create a branch** for your feature or fix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our code style guidelines

3. **Test your changes**:

   ```bash
   ng test
   ng build
   ```

4. **Commit with a clear message**:

   ```bash
   git commit -m "Add: brief description of your change"
   ```

5. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** against the `main` branch

## Code Style Guidelines

### General

- Use TypeScript strict mode
- Follow Angular best practices and conventions
- Keep components focused and single-responsibility
- Use Angular signals for state management

### Naming Conventions

- **Components**: PascalCase (e.g., `SimulatorComponent`)
- **Services**: PascalCase with `Service` suffix (e.g., `SimulationService`)
- **Files**: kebab-case (e.g., `simulation.service.ts`)
- **Selectors**: `sw-` prefix (e.g., `sw-simulator`)

### Code Formatting

This project uses Prettier for code formatting:

- 100 character line width
- Single quotes
- 2-space indentation

Run the formatter before committing:

```bash
npm run format
```

### Documentation

- Add JSDoc comments to public methods and classes
- Include inline comments for complex logic
- Update README.md if adding user-facing features

## Project Structure

```
src/app/
├── components/          # UI components
│   ├── simulator/       # Main canvas simulation
│   ├── control-panel/   # User controls
│   └── header/          # App header
├── services/            # Business logic
├── models/              # TypeScript interfaces and star classes
└── constants/           # Configuration constants
```

## Questions?

If you have questions about contributing, feel free to open an issue with the "question" label.

Thank you for helping make Starwizz better!
