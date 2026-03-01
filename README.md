# electron-make-pacman

An Electron Forge maker for building Arch Linux pacman packages (`.pkg.tar.zst`).

This library provides a native, seamless way to generate pacman packages for your Electron applications directly within your existing Electron Forge configuration.

## Requirements

Building a Pacman package requires the `makepkg` utility. This utility is installed by default on Arch Linux and its derivatives (Manjaro, EndeavourOS, etc.). If you are attempting to build this package on a non-Arch system, the build will fail unless you have configured `makepkg` and `pacman` utilities on your host.

## Installation

```bash
npm install --save-dev electron-make-pacman
```

## Usage in Electron Forge

Add the maker to your `forge.config.js` or `forge.config.ts`:

```javascript
import MakerPacman from 'electron-make-pacman';

export default {
  // ... other forge config
  makers: [
    new MakerPacman({
      options: {
        // Optional: override the default depends list
        depends: ['gtk3', 'nss', 'libxss', 'libxtst', 'alsa-lib']
      }
    }),
    // ... other makers
  ]
};
```

### CLI Usage

You can also use the packaged CLI independently of Electron Forge to package an already unpacked Electron linux build.

```bash
npx electron-make-pacman ./out/my-app-linux-x64
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `depends` | `string[]` | `['gtk3', 'nss', 'libxss', 'libxtst', 'alsa-lib']` | The array of system package dependencies required by the Arch package. |
