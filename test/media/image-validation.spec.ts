import { describe, it, expect } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ImageValidationService } from '../../src/modules/media/services/image-validation.service';
import { VerifiedActor } from '../../src/lib/auth/token.utils';

describe('ImageValidationService (Seguridad, Magic Bytes, SVG XSS e Invariante I17)', () => {
  const service = new ImageValidationService();

  const adminActor: VerifiedActor = {
    rol: 'ADMIN',
    actorId: 'admin',
    username: 'admin',
  };

  const docenteActor: VerifiedActor = {
    rol: 'DOCENTE',
    actorId: 'docente1',
    username: 'docente1',
    docenteId: '11111111-1111-4111-8111-111111111111',
    aulaId: '22222222-2222-4222-8222-222222222222',
  };

  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  const jpegHeader = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
    0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  ]);
  const webpHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
  ]);

  it('acepta archivos válidos PNG, JPEG, WEBP y genera rutas estructuradas únicas', () => {
    const resPng = service.validateAndPrepare({
      file: { originalname: 'Logo Partido #1!.png', mimetype: 'image/png', size: pngHeader.length, buffer: pngHeader },
      actor: adminActor,
      categoria: 'listas',
      eleccionId: 'eleccion-2026',
    });

    expect(resPng.detectedMime).toBe('image/png');
    expect(resPng.bucket).toBe('elecciones-media');
    expect(resPng.esPrivado).toBe(false);
    expect(resPng.rutaArchivo).toMatch(/^listas\/eleccion-2026\/\d+-[a-f0-9]+-logo-partido-1\.png$/);

    const resJpg = service.validateAndPrepare({
      file: { originalname: 'candidato.jpg', mimetype: 'image/jpeg', size: jpegHeader.length, buffer: jpegHeader },
      actor: adminActor,
      categoria: 'candidatos',
      eleccionId: 'eleccion-2026',
    });
    expect(resJpg.detectedMime).toBe('image/jpeg');

    const resWebp = service.validateAndPrepare({
      file: { originalname: 'banner.webp', mimetype: 'image/webp', size: webpHeader.length, buffer: webpHeader },
      actor: adminActor,
      categoria: 'material-electoral',
      eleccionId: 'eleccion-2026',
    });
    expect(resWebp.detectedMime).toBe('image/webp');
  });

  it('rechaza archivos falsificados (spoofing de extensión/MIME con HTML o script)', () => {
    const fakePng = Buffer.from('<html><script>alert("xss")</script></html>', 'utf8');
    expect(() =>
      service.validateAndPrepare({
        file: { originalname: 'malicioso.png', mimetype: 'image/png', size: fakePng.length, buffer: fakePng },
        actor: adminActor,
        categoria: 'listas',
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza inconsistencia entre extensión declarada (.jpg) y magic bytes reales (PNG)', () => {
    expect(() =>
      service.validateAndPrepare({
        file: { originalname: 'disfrazado.jpg', mimetype: 'image/jpeg', size: pngHeader.length, buffer: pngHeader },
        actor: adminActor,
        categoria: 'listas',
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza SVG maliciosos con <script>, onload= o javascript: y acepta SVG limpio sanitizado', () => {
    const xssSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(() =>
      service.validateAndPrepare({
        file: { originalname: 'xss.svg', mimetype: 'image/svg+xml', size: xssSvg.length, buffer: xssSvg },
        actor: adminActor,
        categoria: 'instituciones',
      }),
    ).toThrow(BadRequestException);

    const eventSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle r="10"/></svg>');
    expect(() =>
      service.validateAndPrepare({
        file: { originalname: 'event.svg', mimetype: 'image/svg+xml', size: eventSvg.length, buffer: eventSvg },
        actor: adminActor,
        categoria: 'instituciones',
      }),
    ).toThrow(BadRequestException);

    const cleanSvg = Buffer.from('<!-- comentario --><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>');
    const res = service.validateAndPrepare({
      file: { originalname: 'escudo.svg', mimetype: 'image/svg+xml', size: cleanSvg.length, buffer: cleanSvg },
      actor: adminActor,
      categoria: 'instituciones',
    });
    expect(res.detectedMime).toBe('image/svg+xml');
    expect(res.buffer.toString('utf8')).not.toContain('<!-- comentario -->');
  });

  it('rechaza imágenes que excedan el tamaño máximo configurado (MAX_IMAGE_SIZE_BYTES)', () => {
    const hugeBuffer = Buffer.concat([pngHeader, Buffer.alloc(6 * 1024 * 1024)]);
    expect(() =>
      service.validateAndPrepare({
        file: { originalname: 'pesada.png', mimetype: 'image/png', size: hugeBuffer.length, buffer: hugeBuffer },
        actor: adminActor,
        categoria: 'material-electoral',
      }),
    ).toThrow(BadRequestException);
  });

  it('aplica Invariante I17: prohíbe estrictamente guardar imágenes de DNI o electores', () => {
    expect(() =>
      service.validateAndPrepare({
        file: { originalname: 'dni_alumno.png', mimetype: 'image/png', size: pngHeader.length, buffer: pngHeader },
        actor: adminActor,
        categoria: 'usuarios',
        entidadTipo: 'elector',
        entidadId: '99999999',
      }),
    ).toThrow(ForbiddenException);
  });

  it('impide que un docente suba imágenes de partidos o de otro usuario, y permite solo su propio avatar privado', () => {
    // Intento prohibido sobre partido
    expect(() =>
      service.validateAndPrepare({
        file: { originalname: 'partido.png', mimetype: 'image/png', size: pngHeader.length, buffer: pngHeader },
        actor: docenteActor,
        categoria: 'listas',
      }),
    ).toThrow(ForbiddenException);

    // Intento prohibido sobre avatar de otro docente
    expect(() =>
      service.validateAndPrepare({
        file: { originalname: 'avatar.png', mimetype: 'image/png', size: pngHeader.length, buffer: pngHeader },
        actor: docenteActor,
        categoria: 'usuarios',
        entidadTipo: 'docente',
        entidadId: 'otro-docente-id',
      }),
    ).toThrow(ForbiddenException);

    // Permitido sobre su propio avatar privado
    const own = service.validateAndPrepare({
      file: { originalname: 'mi-foto.png', mimetype: 'image/png', size: pngHeader.length, buffer: pngHeader },
      actor: docenteActor,
      categoria: 'usuarios',
      entidadTipo: 'docente',
      entidadId: docenteActor.docenteId,
    });
    expect(own.esPrivado).toBe(true);
    expect(own.bucket).toBe('elecciones-privado');
    expect(own.rutaArchivo).toContain(`usuarios/docente/${docenteActor.docenteId}/`);
  });
});
