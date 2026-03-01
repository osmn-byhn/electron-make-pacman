import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { createPKGBUILD } from './pkgbuilder.js';
import { logger } from './logger.js';

export interface BuildOptions {
  dir: string;
  makeDir: string;
  appName: string;
  packageJSON: any;
  targetArch: string;
  config?: {
    options?: {
      depends?: string[];
      icon?: string;
      desktopCategories?: string[];
      githubReleaseUrl?: string;
      aurOnly?: boolean;
      repoDb?: string;
    }
  };
}

export async function build(options: BuildOptions): Promise<string> {
  const { dir, makeDir, appName, packageJSON, targetArch } = options;
  const configOpts = options.config?.options || {};

  let arch = 'x86_64';
  if (targetArch === 'arm64') arch = 'aarch64';
  else if (targetArch === 'armv7l') arch = 'armv7h';

  const pkgName = (packageJSON.name || appName).toLowerCase().replace(/[^a-z0-9\-\+\.]/g, '-');
  const pkgVer = (packageJSON.version || '1.0.0').replace(/-/g, '_');

  const executableName = typeof packageJSON.productName === 'string'
    ? packageJSON.productName.replace(/ /g, '')
    : appName;

  const tempDir = path.join(makeDir, `pacman-${pkgName}-${pkgVer}-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const srcAppDir = path.join(tempDir, 'src', 'app');

  // Process local files if not doing a Github Release AUR build
  if (!configOpts.githubReleaseUrl) {
    fs.mkdirSync(srcAppDir, { recursive: true });
    fs.cpSync(dir, srcAppDir, { recursive: true });
  } else {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
  }

  // Process icon
  if (configOpts.icon && fs.existsSync(configOpts.icon)) {
    const iconExt = path.extname(configOpts.icon);
    fs.copyFileSync(configOpts.icon, path.join(tempDir, `src`, `icon${iconExt}`));
  }

  // Generate PKGBUILD
  const buildData: any = {
    name: pkgName,
    version: pkgVer,
    description: packageJSON.description || `${appName} application`,
    executableName,
    arch,
    depends: configOpts.depends || ['gtk3', 'nss', 'libxss', 'libxtst', 'alsa-lib'],
  };

  if (configOpts.icon) buildData.icon = configOpts.icon;
  if (configOpts.desktopCategories) buildData.desktopCategories = configOpts.desktopCategories;
  if (configOpts.githubReleaseUrl) buildData.githubReleaseUrl = configOpts.githubReleaseUrl;
  if (configOpts.aurOnly) buildData.aurOnly = configOpts.aurOnly;

  createPKGBUILD(buildData, tempDir);

  // If aurOnly is set, we just want to print .SRCINFO and return the directory itself 
  // without running the full build (for uploading to AUR)
  if (configOpts.aurOnly) {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('makepkg', ['--printsrcinfo'], { cwd: tempDir });
      let srcinfo = '';
      proc.stdout.on('data', chunk => { srcinfo += chunk; });
      proc.on('close', (code) => {
        if (code === 0) {
          fs.writeFileSync(path.join(tempDir, '.SRCINFO'), srcinfo);
          resolve();
        } else reject(new Error(`.SRCINFO generation failed`));
      });
    });

    // In AUR mode, we return the folder with PKGBUILD and .SRCINFO ready to be git pushed
    const finalAurPath = path.join(makeDir, `${pkgName}-aur`);
    if (fs.existsSync(finalAurPath)) fs.rmSync(finalAurPath, { recursive: true, force: true });
    fs.renameSync(tempDir, finalAurPath);
    return finalAurPath;
  }

  // Run makepkg to build the pacman package
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('makepkg', ['-cfd', '--noconfirm'], {
      cwd: tempDir,
      stdio: 'inherit',
      env: { ...process.env, PKGDEST: tempDir }
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`makepkg failed with code ${code}`));
    });
    proc.on('error', (err) => {
      reject(err);
    });
  });

  const files = fs.readdirSync(tempDir);
  const pkgFile = files.find(f => f.includes('.pkg.tar.'));
  if (!pkgFile) {
    throw new Error('makepkg succeeded but could not find the output package');
  }

  const finalPkgPath = path.join(makeDir, pkgFile);
  fs.renameSync(path.join(tempDir, pkgFile), finalPkgPath);

  // Repo Add integration
  if (configOpts.repoDb) {
    await new Promise<void>((resolve, reject) => {
      logger.info(`Adding ${pkgFile} to repository database ${configOpts.repoDb}...`);
      const proc = spawn('repo-add', [configOpts.repoDb as string, finalPkgPath], { stdio: 'inherit' });
      proc.on('close', (code: number | null) => {
        if (code === 0) resolve();
        else reject(new Error(`repo-add failed with code ${code}`));
      });
      proc.on('error', (err: Error) => reject(err));
    });
  }

  // Cleanup temp dir
  fs.rmSync(tempDir, { recursive: true, force: true });

  return finalPkgPath;
}
