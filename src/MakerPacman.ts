import { MakerBase } from '@electron-forge/maker-base';
import type { MakerOptions } from '@electron-forge/maker-base';
import type { ForgePlatform } from '@electron-forge/shared-types';
import path from 'path';
import fs from 'fs';
import { build } from './packager.js';

export interface MakerPacmanConfig {
  options?: {
    depends?: string[];
    icon?: string;
    desktopCategories?: string[];
    githubReleaseUrl?: string;
    aurOnly?: boolean;
    repoDb?: string;
  };
}

export default class MakerPacman extends MakerBase<MakerPacmanConfig> {
  name = 'pacman';
  defaultPlatforms: ForgePlatform[] = ['linux'];

  isSupportedOnCurrentPlatform(): boolean {
    return process.platform === 'linux';
  }

  async make(options: MakerOptions): Promise<string[]> {
    const { dir, makeDir, appName, packageJSON, targetArch } = options;

    const outPath = await build({
      dir,
      makeDir,
      appName,
      packageJSON,
      targetArch,
      config: this.config,
    });

    return [outPath];
  }
}
