import { buildExportFilename } from './export-filename.util';

describe('export-filename.util', () => {
  describe('buildExportFilename', () => {
    it('should strip the source extension before appending the suffix', () => {
      expect(buildExportFilename('orion.png', 4000, 3000, 'png')).toBe(
        'orion_astrospike_4000_3000.png',
      );
    });

    it('should only strip the last extension of a multi-dot name', () => {
      expect(buildExportFilename('orion.final.png', 800, 600, 'png')).toBe(
        'orion_final_astrospike_800_600.png',
      );
    });

    it('should keep a name without an extension intact', () => {
      expect(buildExportFilename('rawframe', 800, 600, 'png')).toBe(
        'rawframe_astrospike_800_600.png',
      );
    });

    it('should sanitize spaces and special characters to single underscores', () => {
      expect(buildExportFilename('NGC-7000 & M31.tiff', 1920, 1080, 'png')).toBe(
        'ngc_7000_m31_astrospike_1920_1080.png',
      );
    });

    it('should lowercase the sanitized base name', () => {
      expect(buildExportFilename('My Star Field.PNG', 1024, 768, 'png')).toBe(
        'my_star_field_astrospike_1024_768.png',
      );
    });

    it('should map the png format to a .png extension', () => {
      expect(buildExportFilename('m42.jpg', 640, 480, 'png')).toBe('m42_astrospike_640_480.png');
    });

    it('should map the jpeg format to a .jpg extension', () => {
      expect(buildExportFilename('m42.png', 640, 480, 'jpeg')).toBe('m42_astrospike_640_480.jpg');
    });

    it('should embed the export dimensions in the file name', () => {
      const name = buildExportFilename('pleiades.png', 5472, 3648, 'jpeg');
      expect(name).toContain('_5472_3648');
      expect(name).toBe('pleiades_astrospike_5472_3648.jpg');
    });
  });
});
