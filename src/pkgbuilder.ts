import fs from 'fs';
import path from 'path';

export interface PkgBuildData {
  name: string;
  version: string;
  description: string;
  executableName: string;
  arch: string;
  depends: string[];
  icon?: string;
  desktopCategories?: string[];
  githubReleaseUrl?: string;
  aurOnly?: boolean;
}

export function createPKGBUILD(data: PkgBuildData, outDir: string) {
  const dependsStr = data.depends.map(d => `'${d}'`).join(' ');

  // Clean executable name for commands
  const execName = data.executableName;
  const desktopCategories = (data.desktopCategories || ['Utility']).join(';');

  let sourceDef = `source=()`;
  let sha256Def = `sha256sums=()`;

  // If a github release URL is provided, we fetch from there instead of using local source
  if (data.githubReleaseUrl) {
    const fileName = path.basename(data.githubReleaseUrl);
    sourceDef = `source=("${fileName}::${data.githubReleaseUrl}")`;
    sha256Def = `sha256sums=('SKIP')`; // In AUR, usually we generate the exact sum, or use SKIP for auto-updating versions in dev routines
  }

  let content = `
pkgname=${data.name}
pkgver=${data.version}
pkgrel=1
pkgdesc="${data.description}"
arch=('${data.arch}')
license=('custom')
depends=(${dependsStr})
options=(!strip)
${sourceDef}
${sha256Def}

package() {
  # Install app files
  install -dm755 "$pkgdir/opt/\${pkgname}"
`;

  if (data.githubReleaseUrl) {
    content += `  # If downloaded as an archive, extract contents here. Assuming standard tar.gz or simple binary
  # Example logic based on standard electron-builder linux output:
  cp -a "$srcdir/"* "$pkgdir/opt/\${pkgname}/" || true
`;
  } else {
    content += `  # Local build source copy
  cp -a "$srcdir/app/"* "$pkgdir/opt/\${pkgname}/"
`;
  }

  content += `
  # Create executable symlink
  install -dm755 "$pkgdir/usr/bin"
  chmod +x "$pkgdir/opt/\${pkgname}/${execName}"
  ln -s "/opt/\${pkgname}/${execName}" "$pkgdir/usr/bin/\${pkgname}"

  # Fix permissions on sandbox (electron specific requirement) if exists
  if [ -f "$pkgdir/opt/\${pkgname}/chrome-sandbox" ]; then
    chmod 4755 "$pkgdir/opt/\${pkgname}/chrome-sandbox"
  fi
`;

  // .desktop File Generation
  content += `
  # Desktop Entry
  install -dm755 "$pkgdir/usr/share/applications"
  cat > "$pkgdir/usr/share/applications/\${pkgname}.desktop" <<EOF
[Desktop Entry]
Name=${data.name}
Exec=/usr/bin/\${pkgname} %U
Terminal=false
Type=Application
Icon=\${pkgname}
StartupWMClass=${data.name}
Categories=${desktopCategories};
Comment=${data.description}
EOF
`;

  // Icon installation
  if (data.icon) {
    // Determine icon extension and assuming it was copied alongside our PKGBUILD context
    // The packager will copy the user's icon to `src/icon.png` or `src/icon.svg`
    const iconExt = path.extname(data.icon);
    content += `
  # Icon Entry
  install -dm755 "$pkgdir/usr/share/pixmaps"
  cp "$srcdir/icon${iconExt}" "$pkgdir/usr/share/pixmaps/\${pkgname}${iconExt}"
`;
  }

  content += `}
`;

  fs.writeFileSync(path.join(outDir, 'PKGBUILD'), content.trim() + '\n');
}
