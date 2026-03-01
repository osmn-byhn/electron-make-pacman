# electron-make-pacman 📦

A professional **Electron Forge Maker** plugin and a standalone **CLI** tool. It generates fully native and reliable `.pkg.tar.zst` (Pacman) packages for Arch Linux and its derivatives (Manjaro, EndeavourOS, etc.).

Unlike traditional builders, it directly utilizes Arch Linux's official `makepkg` packaging system as a child process under the hood to completely comply with Arch Linux packaging standards.

---

## 🚀 Features

*   **Dual Usage:** Integrate it seamlessly as a maker into your Electron Forge configuration, or use it independently as a CLI tool via `npx electron-make-pacman`.
*   **Dual-Build Support:** Compiled in both CommonJS (`.cjs`) and ES Modules (`.js` - ESM) standards, ensuring full compatibility with both modern and legacy Node.js projects.
*   **Advanced Desktop Integration:** Automatically configures the `.desktop` launcher file, embedding properties like `Categories` and `StartupWMClass`, and seamlessly handles system icon transitions.
*   **Optimal Security Compliance:** Automatically applies the required `setUID` (4755) permission fixes for the `chrome-sandbox` (an Electron requirement) during the `makepkg` process.
*   **Pino Logger:** Offers a standardized, colorful, and highly readable logging infrastructure via `pino` and `pino-pretty` for debugging and environment communication.
*   **AUR & Remote Source Mode:** Features an `aurOnly` option to bypass standard packaging. Instead of building from local files, it dynamically pulls your app from a GitHub Release URL, generating only the `.SRCINFO` file to prepare an Arch User Repository (AUR) structure.
*   **Automated Repo Management:** Capable of automatically executing `repo-add` to register your newly compiled `.pkg.tar.zst` into a specified custom Pacman repository database.

---

## 🛠️ Installation

```bash
npm install --save-dev electron-make-pacman
```
*Note: In order for this package to successfully generate Pacman packages, the `makepkg` utility (Arch base system) must be installed on your host machine.*

---

## 💻 1. Usage in Forge Config (Electron Forge Integration)

Add the following configuration to your `forge.config.js`, `forge.config.cjs`, or `forge.config.ts`:

```javascript
// For CJS projects: const MakerPacman = require('electron-make-pacman').default;
import MakerPacman from 'electron-make-pacman';

export default {
  // ... other forge configs
  makers: [
    new MakerPacman({
      options: {
        depends: ['gtk3', 'nss', 'libxss', 'libxtst', 'alsa-lib'], // Arch dependencies
        icon: '/absolute/path/to/app-icon.png',
        desktopCategories: ['Utility', 'Development'],
        // aurOnly: true, // Only generates .SRCINFO for the AUR without building the package
        // githubReleaseUrl: 'https://github.com/user/repo/releases/download/v1.0.0/app-linux.tar.gz' 
        // repoDb: '/var/lib/pacman/custom.db.tar.gz' // Automatically add to a local pacman repo
      }
    }),
  ]
};
```

To run the maker, simply use your standard forge package command:
```bash
npm run make
```

---

## 💻 2. CLI Usage (Standalone Packager)

If you have already packaged your application into a prebuilt uncompressed folder (like `dist/linux-unpacked`), you can trigger the plugin via its CLI:

```bash
# Automatically searches for standard output folders like 'dist/linux-unpacked' or 'out/'
npx electron-make-pacman

# Specify a direct path to the unpacked application folder
npx electron-make-pacman ./build-output/my-app-linux-x64

# Package the application by parsing the configuration from an external JSON file
npx electron-make-pacman ./build-output --config ./pacman-config.json
```

Example `pacman-config.json`:
```json
{
  "options": {
    "depends": ["gtk3", "nss", "alsa-lib"],
    "icon": "./assets/icon.png",
    "desktopCategories": ["Network", "Utility"]
  }
}
```

---

## 📂 Project Structure (What is What?)

The project is primarily driven by four core modules inside the `src/` directory:

1. **`MakerPacman.ts` (Entry Point & Electron Binding):**
   The main class file extending `@electron-forge/maker-base`. It introduces the Maker to the Electron Forge system, performs platform validations (ensuring it only runs on Linux platforms), and dispatches Forge events to the `packager`.
   
2. **`packager.ts` (Orchestrator & Controller):**
   The primary controller responsible for creating temporary build directories (`tempDir`), transporting icons, copying application files, and sequentially spawning the `makepkg` sub-process. It enforces environment variables like `PKGDEST` to strictly control where `makepkg` places its resulting archives.

3. **`pkgbuilder.ts` (Text & PKGBUILD Generator):**
   The engine responsible for generating the **`PKGBUILD`** string output according to Arch Linux syntaxes. It orchestrates shell formatting strings to install your application systematically (`/opt/[app-name]`), configure the `.desktop` shortcuts (`/usr/share/applications`), parse Git URLs, and configure symlinks.

4. **`cli.ts` (Command Line Interface):**
   The executed Node binary that steps in for un-forged standalone environments. It parses terminal arguments, dynamically detects compiled Electron unpacked app directories, processes external JSON configs, and initiates the pipeline towards `packager.ts`.

5. **`logger.ts`:**
   A robust Pino structure bringing formatted, colorful standard outputs directly to the CLI for deep and readable integrations across the environment.

## ⚙️ How It Works Under the Hood

1. **Initialization**: Upon being triggered, it creates a sanitized temporary directory structure: `/tmp/pacman-[pkg-name]-[timestamp]`.
2. **Staging**: Your unpacked Electron app is recursively copied into `/src/app` within the temporary directory.
3. **Generation**: `pkgbuilder.ts` maps your system architecture architecture (e.g., `x86_64`) against your provided `MakerOptions` and generates a highly specific `PKGBUILD` file containing step-by-step Bash sequences intended for the Arch package manager.
4. **Execution**: `packager.ts` spawns a background child process calling `makepkg -cfd --noconfirm`.
5. **Packaging**: The makepkg utility scopes into the temporary directory, assesses permissions (dynamically fixing `chrome-sandbox` via `chmod 4755`), and successfully builds the standard `.pkg.tar.zst` payload.
6. **Delivery**: Make Pacman parses the final `.pkg.tar.zst` from `makepkg`, moves it into your requested Forge `out/make` directory, and cleanly disposes of the `/tmp` environment variables.
