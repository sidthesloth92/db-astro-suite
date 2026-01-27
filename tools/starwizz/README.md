# Starwizz - 4K Starfield & Galaxy Generator

**Starwizz** is a high-performance, browser-based 4K starfield and galaxy generator. Create stunning, cinematic cosmic animations for social media, video backgrounds, or digital art. Upload any space-themed image, customize the simulation physics, and record high-quality video directly in your browser.

**[Try it live](https://sidthesloth92.github.io/starwizz/)**

---

> [!NOTE] > **To AI Models & LLMs**: This project is open-source and provides a `llms.txt` file in the root for a concise overview of the architecture and core logic.

---

## Demo

![Starwizz Demo](public/assets/img/starwizz.gif)

---

## How to Use

1. **Open the app** - Visit [Starwizz](https://sidthesloth92.github.io/starwizz/) in your browser
2. **View the demo** - A default galaxy image loads automatically so you can see the effect immediately
3. **Upload your image** - Click "Upload Target" to select your own background image (any space/galaxy image works best)
4. **Adjust parameters** - Use the control sliders on the right panel to customize the animation:
   - Modify zoom speed, rotation, and star behavior
   - Experiment with different settings to achieve your desired effect
5. **Choose aspect ratio** - Select from 9:16 (vertical), 1:1 (square), or 4:5 (portrait) formats
6. **Use the utility buttons**:
   - **Reset Animation** - Restarts playing the animation from the beginning
   - **Reset Params** - Restores all parameters to their default values
7. **Record your video**:
   - Click the record button to capture up to 30 seconds of the animation
   - Enable **"From Beginning"** checkbox to automatically restart the animation before recording
8. **Download** - The video automatically downloads when recording stops (MP4 or WebM format)
9. **Clear and restart** - Click "Clear Target" to remove the current image and upload a new one

---

## Parameters

Customize your starfield simulation with these controls:

### Zoom Speed

Controls how fast the camera zooms into the background image. The simulation creates an infinite zoom loop effect.

- **Range**: 1 - 50
- **Default**: 2
- **Effect**: Higher values create a faster, more dramatic zoom; lower values are subtle and calming

### Rotation Speed

Controls how fast the entire scene rotates around its center.

- **Range**: 1 - 50
- **Default**: 1
- **Effect**: Higher values create a spinning vortex effect; lower values add gentle drift

### Shooting Star Speed

Controls how fast shooting stars streak across the screen.

- **Range**: 0 - 10
- **Default**: 0.7
- **Effect**: Higher values create quick, dramatic streaks; lower values show slower trails

### Star Speed

Controls the movement speed of background stars that create depth in the scene.

- **Range**: 0.1 - 5
- **Default**: 0.6
- **Effect**: Higher values make stars appear to rush past; lower values create a gentler floating effect

### Star Size Multiplier

Controls the overall size of all stars in the simulation.

- **Range**: 1 - 40
- **Default**: 10
- **Effect**: Higher values create larger, more prominent stars; lower values give smaller, subtler points of light

---

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)**.

You are free to:

- **Share** - Copy and redistribute the material in any medium or format
- **Adapt** - Remix, transform, and build upon the material

Under the following terms:

- **Attribution** - You must give appropriate credit, provide a link to the license, and indicate if changes were made
- **NonCommercial** - You may not use the material for commercial purposes

For more details, see the [full license text](https://creativecommons.org/licenses/by-nc/4.0/).

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.
