#!/usr/bin/env node
import path from 'path';
import fs from 'fs';
import { build } from "./packager.js";
import { logger } from './logger.js';

async function run() {
    const args = process.argv.slice(2);
    let appDir = '';
    let configPath = '';

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--config') {
            configPath = String(args[i + 1] || '');
            i++;
        } else if (!appDir) {
            appDir = args[i] || '';
        }
    }

    // Auto-detect standard output directories if not defined
    if (!appDir) {
        if (fs.existsSync(path.resolve('dist/linux-unpacked'))) {
            // electron-builder standard output
            appDir = path.resolve('dist/linux-unpacked');
        } else if (fs.existsSync(path.resolve('out'))) {
            // electron-forge standard output discovery
            const dirs = fs.readdirSync(path.resolve('out'));
            const forgeDir = dirs.find(d => d.includes('-linux-'));
            if (forgeDir) appDir = path.resolve('out', forgeDir);
        }
    }

    appDir = path.resolve(appDir || "dist/linux-unpacked");

    if (!fs.existsSync(appDir)) {
        logger.error(`Error: Unpacked app directory ${appDir} does not exist`);
        process.exit(1);
    }

    let packageJSON = { name: 'electron-app', version: '1.0.0' };
    const pkgPath = path.join(appDir, 'resources', 'app', 'package.json');
    if (fs.existsSync(pkgPath)) {
        packageJSON = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    }

    // Parse external JSON config if specified
    let customConfig = { options: {} };
    if (configPath && fs.existsSync(path.resolve(configPath))) {
        customConfig = JSON.parse(fs.readFileSync(path.resolve(configPath), 'utf-8'));
    }

    const makeDir = path.join(process.cwd(), 'out', 'make');
    fs.mkdirSync(makeDir, { recursive: true });

    try {
        logger.info(`Building pacman package for ${appDir}...`);
        const outPath = await build({
            dir: appDir,
            makeDir: makeDir,
            appName: packageJSON.name || 'electron-app',
            packageJSON: packageJSON,
            targetArch: 'x64',
            config: customConfig
        });
        logger.info(`Successfully finished at: ${outPath}`);
    } catch (err) {
        logger.error({ err }, "Task failed:");
        process.exit(1);
    }
}

run();
