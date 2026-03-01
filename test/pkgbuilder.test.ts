import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createPKGBUILD, type PkgBuildData } from '../src/pkgbuilder.js';

vi.mock('fs');

describe('PKGBUILD Generator', () => {
    const outDir = '/tmp/test-out';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate a standard PKGBUILD correctly with minimum data', () => {
        const data: PkgBuildData = {
            name: 'test-app',
            version: '1.0.0',
            description: 'A test application',
            executableName: 'testapp',
            arch: 'x86_64',
            depends: ['gtk3', 'nss'],
        };

        createPKGBUILD(data, outDir);

        expect(fs.writeFileSync).toHaveBeenCalledOnce();
        const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0] || [];
        const filePath = callArgs[0] as string;
        const content = callArgs[1] as string;

        expect(filePath).toBe(path.join(outDir, 'PKGBUILD'));
        expect(content).toContain('pkgname=test-app');
        expect(content).toContain('pkgver=1.0.0');
        expect(content).toContain(`pkgdesc="A test application"`);
        expect(content).toContain(`arch=('x86_64')`);
        expect(content).toContain(`depends=('gtk3' 'nss')`);
        expect(content).toContain('source=()');

        // Check package function contents
        expect(content).toContain(`install -dm755 "$pkgdir/opt/\${pkgname}"`);
        expect(content).toContain(`cp -a "$srcdir/app/"* "$pkgdir/opt/\${pkgname}/"`);
        expect(content).toContain(`ln -s "/opt/\${pkgname}/testapp" "$pkgdir/usr/bin/\${pkgname}"`);
    });

    it('should generate a .desktop and icon entry if provided', () => {
        const data: PkgBuildData = {
            name: 'fancy-app',
            version: '2.0.0',
            description: 'A fancy app',
            executableName: 'fancy',
            arch: 'aarch64',
            depends: [],
            icon: '/path/to/myicon.png',
            desktopCategories: ['Development', 'Utility'],
        };

        createPKGBUILD(data, outDir);

        const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0] || [];
        const content = callArgs[1] as string;

        // Check Categories
        expect(content).toContain('Categories=Development;Utility;');
        expect(content).toContain('Icon=${pkgname}');

        // Check Icon copy logic
        expect(content).toContain(`cp "$srcdir/icon.png" "$pkgdir/usr/share/pixmaps/\${pkgname}.png"`);
    });

    it('should generate github release AUR mode properly', () => {
        const data: PkgBuildData = {
            name: 'remote-app',
            version: '3.0.0',
            description: 'Remote App',
            executableName: 'remote',
            arch: 'x86_64',
            depends: [],
            aurOnly: true,
            githubReleaseUrl: 'https://github.com/user/repo/releases/download/v3.0.0/app-linux.tar.gz'
        };

        createPKGBUILD(data, outDir);

        const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0] || [];
        const content = callArgs[1] as string;

        expect(content).toContain('source=("app-linux.tar.gz::https://github.com/user/repo/releases/download/v3.0.0/app-linux.tar.gz")');
        expect(content).toContain(`sha256sums=('SKIP')`);

        // Source copying logic should be different for remote archives
        expect(content).toContain(`cp -a "$srcdir/"* "$pkgdir/opt/\${pkgname}/" || true`);
        expect(content).not.toContain(`cp -a "$srcdir/app/"*`);
    });
});
