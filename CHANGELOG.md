# Changelog

## [1.6.0](https://github.com/sidthesloth92/db-astro-suite/compare/v1.5.0...v1.6.0) (2026-03-01)


### Features

* enable continuous deployment ([618f39c](https://github.com/sidthesloth92/db-astro-suite/commit/618f39c984446c35c68b6bcc5301831eb6e9e3ce))
* simplify pipeline triggers ([7fe6dc0](https://github.com/sidthesloth92/db-astro-suite/commit/7fe6dc03c49040ee108e0bb09af6703e7b6ed298))
* trigger explicit pipeline logic ([4cc3378](https://github.com/sidthesloth92/db-astro-suite/commit/4cc33781dcfb59fefcd0c9490179ce4c0d32323b))

## [1.5.0](https://github.com/sidthesloth92/db-astro-suite/compare/v1.4.0...v1.5.0) (2026-03-01)


### Features

* trigger new release ([5cdd31f](https://github.com/sidthesloth92/db-astro-suite/commit/5cdd31f3ede151348974043365a07190057bc640))

## [1.4.0](https://github.com/sidthesloth92/db-astro-suite/compare/v1.3.0...v1.4.0) (2026-03-01)


### Features

* Adjust pipeline to allow release-please to run independently and skip verification for release commits. ([ced6a6c](https://github.com/sidthesloth92/db-astro-suite/commit/ced6a6cceb84a1003abbc2bf21be3057c8192d3e))
* update release-please workflow to depend on and run only after successful or skipped verify job ([ef26c55](https://github.com/sidthesloth92/db-astro-suite/commit/ef26c55ae3912a282eaf8c09d71da31c74a77f63))

## [1.3.0](https://github.com/sidthesloth92/db-astro-suite/compare/v1.2.0...v1.3.0) (2026-03-01)


### Features

* Enhance SEO by adding `RouteMeta` to pages and updating public crawl files. ([cddf18f](https://github.com/sidthesloth92/db-astro-suite/commit/cddf18fed4bae2ce07a2e2170e5a48e32440ec07))

## [1.2.0](https://github.com/sidthesloth92/db-astro-suite/compare/v1.1.0...v1.2.0) (2026-03-01)


### Features

* Integrate GitHub Pages deployment directly into the release workflow and update the standalone deploy workflow to be manually triggered. ([5ed503e](https://github.com/sidthesloth92/db-astro-suite/commit/5ed503ee8b8e528b24db2a8897331677de7322ff))

## [1.1.0](https://github.com/sidthesloth92/db-astro-suite/compare/v1.0.0...v1.1.0) (2026-03-01)


### Features

* Configure Playwright visual testing with a maximum diff pixel ratio and custom snapshot path, and remove an outdated visual test result. ([5aeab8f](https://github.com/sidthesloth92/db-astro-suite/commit/5aeab8fcf4178d90c71e266d31aa73b4f5747146))

## 1.0.0 (2026-03-01)


### Features

* Add `form-container` wrapper to card form components and introduce new CSS utility classes for layout. ([f4779a0](https://github.com/sidthesloth92/db-astro-suite/commit/f4779a0e10e857374bc864c596057b04c5a3045e))
* Add `preview-card-viewport` container, remove card border for export, and correct equipment item display. ([bae0355](https://github.com/sidthesloth92/db-astro-suite/commit/bae0355a3118e2587caeab567dcf44c69770a91c))
* Add `ViewEncapsulation.None` to `CardFormComponent` for global style application. ([d55e474](https://github.com/sidthesloth92/db-astro-suite/commit/d55e4748f5b81ec136cf36296075d15069f229d8))
* Add animated star, nebula, and scanline background overlays to app UIs. ([4129226](https://github.com/sidthesloth92/db-astro-suite/commit/412922619e72c2557c057079871c1f98226fa635))
* Add AstroGram dossier page and rename "Media" card titles to "Demo" in existing dossier pages. ([b144960](https://github.com/sidthesloth92/db-astro-suite/commit/b144960d19ec0b763499626ce3854b943dbdd88c))
* add close, cloud upload, GitHub, and question mark circle SVG icons along with a favicon. ([aa4061e](https://github.com/sidthesloth92/db-astro-suite/commit/aa4061e5d4952779037b3ef9e15abb2ea5dd59ec))
* Add comprehensive Playwright visual tests for Astrogram layout, aspect ratio changes, and accordion interactivity. ([99f1c55](https://github.com/sidthesloth92/db-astro-suite/commit/99f1c55b66ff444ef4c315c4fb32f891b433a9e0))
* Add CONTRIBUTING.md and enhance README.md with usage instructions and parameters ([8375d31](https://github.com/sidthesloth92/db-astro-suite/commit/8375d310c33374da52b2bee5029e86b59a5b273c))
* Add default rosette background image and remove default expansion for card settings accordion. ([eb8e363](https://github.com/sidthesloth92/db-astro-suite/commit/eb8e3634e127c47f8c5d235fc1f8859bf0ac521c))
* add equipment preset management to the card form, including a new service and UI for saving, loading, and deleting equipment configurations. ([758075a](https://github.com/sidthesloth92/db-astro-suite/commit/758075afa5e4f2f4ecc23c86c3304a117c604da1))
* add favicon.ico ([00a16f3](https://github.com/sidthesloth92/db-astro-suite/commit/00a16f3a489de752595c745171f2a413a44bc6d6))
* add Google Analytics (gtag.js) tracking script ([69cc0ee](https://github.com/sidthesloth92/db-astro-suite/commit/69cc0eeb9331e1be83217bf5c99e8236bc4a9c6e))
* Add Google Analytics to Astrogram and Hub, implement an export loading overlay for card preview, and clean up outdated visual test result images. ([466d2be](https://github.com/sidthesloth92/db-astro-suite/commit/466d2bebdd969be5ce6253160b7edbf2bc577c58))
* Add image upload overlay component and integrate it into the simulator ([3ea7363](https://github.com/sidthesloth92/db-astro-suite/commit/3ea7363e96381ba9b6b1dff075dfe6e39570dc37))
* Add mobile responsiveness to the header component and dossier page layouts with dynamic content and adjusted styling. ([67e8aa7](https://github.com/sidthesloth92/db-astro-suite/commit/67e8aa7f16df37fb413495304d006f77d7542f61))
* Add new galaxy images and replace external star sprite with a generated texture for improved star rendering. ([22bae10](https://github.com/sidthesloth92/db-astro-suite/commit/22bae106f3fe3ded4fb2b38992b3083288e57a9f))
* Add Playwright E2E and visual regression tests for Astrogram, Starwizz, and Hub applications. ([9e9dda2](https://github.com/sidthesloth92/db-astro-suite/commit/9e9dda25105492f885afce2b09bd365688e74cf7))
* add preview.png image. ([d242944](https://github.com/sidthesloth92/db-astro-suite/commit/d2429441bdf1ba72014297c1b28fc98ad536b01b))
* Add shooting stars with trails and refactor star generation and controls. ([9b3fa81](https://github.com/sidthesloth92/db-astro-suite/commit/9b3fa81eddb50c2723a5460775e518b3fab21394))
* Add sitemap.xml for SEO and preview.png asset. ([6a7d9c2](https://github.com/sidthesloth92/db-astro-suite/commit/6a7d9c25efa4e42783a3ee882efaac45c540d4f6))
* Add user image upload and clear functionality, and gate simulation activity on image presence. ([dcce799](https://github.com/sidthesloth92/db-astro-suite/commit/dcce799931ab475ba969f1412e2a42309a536b32))
* Adjust Bortle scale icon and compact row spacing, and remove unused compact section styling. ([1e4da90](https://github.com/sidthesloth92/db-astro-suite/commit/1e4da9078467c8633237d8f10460da8ae8ddc559))
* Allow checkbox font size inheritance and apply specific size in the control panel. ([2081659](https://github.com/sidthesloth92/db-astro-suite/commit/2081659ea149e7999e74ab1c1d47f2c6a6488957))
* Configure GitHub Pages deployment, update font asset paths, and remove unused images. ([19178ff](https://github.com/sidthesloth92/db-astro-suite/commit/19178ff291e22b01a1c3140a2e7e1cfa23e9b4a9))
* Disable 'FILE GROUPER' card on the index page and update its status to 'IN PROGRESS' with new styling. ([f11433a](https://github.com/sidthesloth92/db-astro-suite/commit/f11433a70b055338b6183b0508e9a2f8badfa3b9))
* display app version in the header and add release-please GitHub Actions workflow. ([04f94f9](https://github.com/sidthesloth92/db-astro-suite/commit/04f94f9d7b8d5b20a0008fd92f5b552db37b84a1))
* display live recording duration in the control panel and implement recording timer ([c3d0c31](https://github.com/sidthesloth92/db-astro-suite/commit/c3d0c315a8ef187d7b933a33ddae5acad7b9ff43))
* Dynamically scale image exports, await font loading, and ensure state reset in a finally block. ([1d24928](https://github.com/sidthesloth92/db-astro-suite/commit/1d24928eb84555979431cfbb188af2ae1008371e))
* enhance build process with recursive dist cleanup and robust merge operations. ([f03f280](https://github.com/sidthesloth92/db-astro-suite/commit/f03f280087fdb3379e6716695fd2cf75588b8724))
* enhance build process with recursive dist cleanup and robust merge operations. ([496298e](https://github.com/sidthesloth92/db-astro-suite/commit/496298eafc68b03b1e4b526f44d974eeda1767d8))
* Enhance discoverability with new sitemap and robots.txt files, and updated meta tags for hub and astrogram pages. ([46a21d8](https://github.com/sidthesloth92/db-astro-suite/commit/46a21d8baeaf0d2f0243c9a82a5bbaf540dbe3c3))
* enhance integration settings filter chips with status dots and editable names for additional filters, alongside related styling adjustments. ([0f8445f](https://github.com/sidthesloth92/db-astro-suite/commit/0f8445f657384228367ea1d5b9c2626b50440650))
* Enhance project branding, improve SEO with meta tags, and add AI/LLM-specific documentation and web crawling rules. ([c388ffb](https://github.com/sidthesloth92/db-astro-suite/commit/c388ffbb64e0fe1fb33c4e77742cac95f05b2dc4))
* Enhance SEO across the suite by adding comprehensive meta tags, Open Graph, Twitter cards, canonical URLs, robots.txt, and sitemap.xml. ([66a3fd1](https://github.com/sidthesloth92/db-astro-suite/commit/66a3fd182974485d4b2c3a725fa045aa26136b7b))
* Extract AmbientStar and ShootingStar classes into dedicated model files. ([8514918](https://github.com/sidthesloth92/db-astro-suite/commit/851491843cdb41cce1db8cf18c50d5a8642cb0e2))
* Implement a new stacked label/value display for equipment and software details, update default data, and refactor form inputs to native elements. ([98e91dd](https://github.com/sidthesloth92/db-astro-suite/commit/98e91ddc37b1274d74d65da72cfce58a840c691c))
* Implement aspect ratio selection and default background image functionality ([aebfdcf](https://github.com/sidthesloth92/db-astro-suite/commit/aebfdcf4fc4bd3f691504e6f6490172ee117a21a))
* Implement card opacity control, convert accent color to RGB for CSS variables, and refine card form styling and filter ring dimensions. ([75eb1d3](https://github.com/sidthesloth92/db-astro-suite/commit/75eb1d3ce993c9d745b2404f9a20b1cffaae91a1))
* Implement futuristic UI/UX with new layout, neon styling, and HUD elements. ([805379e](https://github.com/sidthesloth92/db-astro-suite/commit/805379ebdefd840ac0e4cd37ce41b489e24d123d))
* Implement HUD overlay, loading overlay, image upload, and clear image button components ([ae8b891](https://github.com/sidthesloth92/db-astro-suite/commit/ae8b891e4e19e6c197c87986915ef092aa7eed05))
* Implement internal multipliers for zoom and rotation controls, allowing user-friendly UI ranges. ([54c6a7d](https://github.com/sidthesloth92/db-astro-suite/commit/54c6a7da757625f7b829ffe256c50e970c93c2e9))
* Implement reactive canvas dimensions using a service signal and constant, and remove `isPlatformBrowser` check. ([b249061](https://github.com/sidthesloth92/db-astro-suite/commit/b24906104d6a2a05ac9aa383afb735e7def04c3c))
* Implement responsive layout for mobile devices by adding media queries and adjusting component styles. ([bcae2c5](https://github.com/sidthesloth92/db-astro-suite/commit/bcae2c54a73ea1c1c8091a64e385cc1e42a2def2))
* Implement responsive scaling for the card preview and export functionality using a ResizeObserver. ([4842459](https://github.com/sidthesloth92/db-astro-suite/commit/4842459386bf36201e4da7a79be99e628f513f27))
* Implement Slider and SpaceButton UI components and refactor ControlPanel and Header to utilize them. ([9c1b83c](https://github.com/sidthesloth92/db-astro-suite/commit/9c1b83c43e22a0fe698713d1091b12322d757957))
* Implement tooltips for control panel settings with descriptions and adjust minor UI styles. ([36db423](https://github.com/sidthesloth92/db-astro-suite/commit/36db42322303abac0a7f4811b121421354eab636))
* Integrate `@db-astro-suite/ui` into tools, update `tsconfig` and Tailwind paths, and refine `astrocard` styling. ([929f050](https://github.com/sidthesloth92/db-astro-suite/commit/929f0509979063c7b0517c63fb4b79ceb383ee22))
* Integrate shared theme and UI packages into Starwizz, update project dependencies, and add new development scripts. ([ccfad50](https://github.com/sidthesloth92/db-astro-suite/commit/ccfad50e5b9be8f28b3162bec5cd707388c322b9))
* introduce `SimulationService` to centralize simulation parameters and recording state, refactoring `App` and control panel components to utilize it. ([11843a3](https://github.com/sidthesloth92/db-astro-suite/commit/11843a37ae537397ee1ac722ee37df91cd06d481))
* Introduce a new dossier section with StarWizz, Astro Card, and File Grouper pages, and add a shared Footer UI component. ([1fa5856](https://github.com/sidthesloth92/db-astro-suite/commit/1fa5856d46e8ac449db5a208a4ba8876aa6aa799))
* introduce Accordion and Header UI components and refactor Astrocard form with them, alongside a visual redesign of the Bortle scale. ([ca97227](https://github.com/sidthesloth92/db-astro-suite/commit/ca97227f33c477e6ff9255d44e654585358f57bf))
* Introduce AstroCard tool with new UI components, data models, and styling for generating astrophotography cards. ([d9aae7c](https://github.com/sidthesloth92/db-astro-suite/commit/d9aae7c5fa3b48afee06e16ee4d6b80a5c4cb4f6))
* Introduce dynamic accent color styling for components and integrate CardDataService into CardFormComponent. ([ba194d9](https://github.com/sidthesloth92/db-astro-suite/commit/ba194d94a07a6664f00b757f6209ac0ad2e670ad))
* introduce header component with app title and external links ([0b35365](https://github.com/sidthesloth92/db-astro-suite/commit/0b35365e542f10ac1ddb270a205f891def60e98a))
* Introduce Instagram caption generation and one-tap copy features, and refine Astrogram's overview and capability descriptions. ([dfb460a](https://github.com/sidthesloth92/db-astro-suite/commit/dfb460a8c86f8c36bbb9e9a5e201911fb756a322))
* Introduce logos and updated descriptions for Astrogram and Starwizz, enhancing the `db-card` component and refreshing Astrogram's favicon. ([f839ac1](https://github.com/sidthesloth92/db-astro-suite/commit/f839ac1735ded1d3dfc0239e1b492c6756b96638))
* Introduce new `db-input`, `db-textarea`, `db-select`, and `db-checkbox` UI components and integrate them into `starwizz` and `astrocard` forms. ([e981f74](https://github.com/sidthesloth92/db-astro-suite/commit/e981f74a3918cad4486ccc235ef88111688067ac))
* introduce new logo image, update favicon, and display it in the header. ([a39c4bd](https://github.com/sidthesloth92/db-astro-suite/commit/a39c4bdeaf83637eee83354270501c7649d4bd9c))
* introduce new UI components and enhance Astrogram card form functionality ([7e443e1](https://github.com/sidthesloth92/db-astro-suite/commit/7e443e11d2b0ae498902805b7a78e8fb0747722c))
* Make the header logo and title clickable via a new `logoLink` input and apply it to app headers. ([4016750](https://github.com/sidthesloth92/db-astro-suite/commit/4016750d120d1913ca305f74194bf5964f16ee05))
* Migrate card image export from html2canvas to modern-screenshot and refine card styling for improved capture. ([c2c3d8b](https://github.com/sidthesloth92/db-astro-suite/commit/c2c3d8b4816936a1307779f90089e3fe4c1a98c8))
* Migrate Starwizz application to tools directory, introduce new UI and theme packages, and add Astro Go generator. ([5ad6ea3](https://github.com/sidthesloth92/db-astro-suite/commit/5ad6ea386f4595f74ebe3a5b5a983cf9994855bd))
* Migrate to local fonts and update background image, removing old assets. ([d037a09](https://github.com/sidthesloth92/db-astro-suite/commit/d037a09233959f34c8553b371e0c4b68bdbc341a))
* Move 404.html creation from the GitHub Actions workflow to the `build:collect` script in `package.json`. ([8c9e68a](https://github.com/sidthesloth92/db-astro-suite/commit/8c9e68abfb2fca8acfda8bbfad0b2b6acf8a52e6))
* Perfecto. Adjust shooting star speed, size, and spawn rate parameters for visual tuning. ([2335846](https://github.com/sidthesloth92/db-astro-suite/commit/23358463dd961d7fb5fb0154e41adc73f6b76574))
* Rebrand project from Starwizz to Astrogram, transforming it into an astrophotography exposure card generator with updated documentation and configurations. ([c89b804](https://github.com/sidthesloth92/db-astro-suite/commit/c89b80421df5c12f2d5b663c6c934593aa261abd))
* Redesign card preview to mimic a social media post, adding a caption section and Wikipedia object description fetching. ([c414462](https://github.com/sidthesloth92/db-astro-suite/commit/c414462dbf2901eb3f78246ade5cb817a99fc1f8))
* Redesign neon button and refactor Astrocard form styling with new mini components ([4a9375c](https://github.com/sidthesloth92/db-astro-suite/commit/4a9375c9e171d6285a17fad9a4fbcd6f05e715fc))
* Refactor card preview layout for improved readability and spacing, truncate long descriptions, and add filters to equipment data. ([06f1721](https://github.com/sidthesloth92/db-astro-suite/commit/06f17212f6e8eb49c606c9bb5ba355075aee085d))
* Refactor image upload and clear image methods in Simulator and SimulationService ([16b21e4](https://github.com/sidthesloth92/db-astro-suite/commit/16b21e4d419ba8b6f266a4ed777a27d33b28fb18))
* Refine UI styling with updated glass effects, scanlines, form inputs, card preview layout, and improved accordion animation. ([8ff0255](https://github.com/sidthesloth92/db-astro-suite/commit/8ff0255e95f55888cac3d0f90b6f631c74aa6bad))
* Relocate launch/repository access buttons to page headers and enhance header/footer layout with improved responsiveness. ([857305f](https://github.com/sidthesloth92/db-astro-suite/commit/857305fa3a0aa32050c85b2463630289ce056731))
* remove unused `getControlSignal` method from simulation service. ([a0dd45a](https://github.com/sidthesloth92/db-astro-suite/commit/a0dd45aaab50084c56eca16ddfd559487df30c33))
* Replace `NeonButtonComponent` with a custom-styled subtle add button in card form settings components and add its corresponding CSS. ([f47a93d](https://github.com/sidthesloth92/db-astro-suite/commit/f47a93d88b2dc05a7a1acfda7c118c4549b69f89))
* Replace 9:16 aspect ratio with 3:4, updating UI options, default card settings, and styling. ([2508c75](https://github.com/sidthesloth92/db-astro-suite/commit/2508c75ec5679ac099e6c4dcadc929a527607c30))
* Replace placeholder demo content with actual images and add new demo assets to Starwizz and Astrogram pages. ([461fbfd](https://github.com/sidthesloth92/db-astro-suite/commit/461fbfd455d7928cd5999463818eaca64d8caff1))
* Switch UI theme from neon cyan to neon pink. ([3ca71cc](https://github.com/sidthesloth92/db-astro-suite/commit/3ca71cc499f615c4898636422e5881a2170d2dc3))
* Update Angular UI components to use new `[@for](https://github.com/for)`/`[@if](https://github.com/if)` control flow, refactor `select` for manual value handling, adjust `package.json` dependencies, and refine Astrocard styling and layout. ([7a11ccc](https://github.com/sidthesloth92/db-astro-suite/commit/7a11ccc585e7ff722f2f26b364126a83f8925dc7))
* Update card export to JPEG format, add a loading state, and improve download handling. ([1d565ae](https://github.com/sidthesloth92/db-astro-suite/commit/1d565ae62edf5bc8d50ce06f835cba83d3b04864))
* Update component selectors with `dba-` prefix and refresh visual regression snapshots. ([12c52fc](https://github.com/sidthesloth92/db-astro-suite/commit/12c52fcf47bef85ad3f00a8146e6f1730dc036ea))
* Update default filter exposure values and refine card preview vertical layout. ([bbfcc49](https://github.com/sidthesloth92/db-astro-suite/commit/bbfcc49657f3be64c11b01fd4c83188e1bbc71b6))
* update hero subtitle text on the index page. ([83663fb](https://github.com/sidthesloth92/db-astro-suite/commit/83663fb52eb7765063414f9e96b074c6fef18b54))
* Update website title, meta descriptions, and hero subtitle to reflect the 'From Sensor to Social' tagline. ([2289c0b](https://github.com/sidthesloth92/db-astro-suite/commit/2289c0b460568d764595ece2c83238637fe70608))


### Bug Fixes

* convert hub from git submodule to regular directory ([0574f76](https://github.com/sidthesloth92/db-astro-suite/commit/0574f763788a77bcd8484805dfdc686557f91106))
* Prevent image upload overlay from displaying while the default image is loading. ([9442827](https://github.com/sidthesloth92/db-astro-suite/commit/9442827e7d3ee2ac7fa303cef51d32628cea73f2))
* Remove package-name from release-please workflow configuration. ([e9aff5e](https://github.com/sidthesloth92/db-astro-suite/commit/e9aff5eb172f1b7ea0f646f6429d9431458ad4bf))
* restore Starwizz styling by mapping design tokens to Tailwind v4 and enhancing shared button component ([af202d7](https://github.com/sidthesloth92/db-astro-suite/commit/af202d7b18e31ad501dbca162b5df65ed73e4cdc))
* Temporarily disable and restore parent CSS transforms to ensure accurate `domToJpeg` capture dimensions. ([d4f7817](https://github.com/sidthesloth92/db-astro-suite/commit/d4f781788671ac4a7dfbfd89750765d961f918dd))
* Update all project URLs and paths to reflect deployment under the `db-astro-suite` subpath. ([94986c8](https://github.com/sidthesloth92/db-astro-suite/commit/94986c8c79d485bdb1cef5a7b4cd2ff99d1b87c0))
