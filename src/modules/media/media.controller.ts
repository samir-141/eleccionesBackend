import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VerifiedActor } from '../../lib/auth/token.utils';
import { MediaAuthGuard, RequireMediaRoles } from './guards/media-auth.guard';
import {
  UpdateInstitucionMediaDto,
  UpdateMediaDto,
  UploadMediaMetadataDto,
} from './dto/media.dto';
import { SupabaseDiagnosticsService } from './services/supabase-diagnostics.service';
import { ImageUploadService } from './services/image-upload.service';
import { ImageUpdateService } from './services/image-update.service';
import { ImageDeleteService } from './services/image-delete.service';
import { MediaQueryService } from './services/media-query.service';
import { UploadedBinaryFile } from './services/image-validation.service';
import { PrismaService } from '../../database/prisma.service';

@Controller()
export class MediaController {
  constructor(
    private readonly diagnosticsService: SupabaseDiagnosticsService,
    private readonly uploadService: ImageUploadService,
    private readonly updateService: ImageUpdateService,
    private readonly deleteService: ImageDeleteService,
    private readonly queryService: MediaQueryService,
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================================
  // PÚBLICO: Identidad Institucional y Material Electoral Público
  // =========================================================================
  @Get('api/public/media/institucion')
  async obtenerInstitucionPublica() {
    return this.queryService.obtenerConfiguracionPublica();
  }

  // =========================================================================
  // ADMINISTRACIÓN: Diagnóstico Automático de Conexión y Buckets Supabase
  // =========================================================================
  @Get('api/admin/media/diagnostico')
  @UseGuards(MediaAuthGuard)
  @RequireMediaRoles('ADMIN')
  async obtenerDiagnostico() {
    return this.diagnosticsService.runDiagnostics();
  }

  @Post('api/admin/media/diagnostico/inicializar-buckets')
  @UseGuards(MediaAuthGuard)
  @RequireMediaRoles('ADMIN')
  async inicializarBuckets() {
    return this.diagnosticsService.initializeRequiredBuckets();
  }

  // =========================================================================
  // ADMINISTRACIÓN: Panel Centralizado de Imágenes
  // =========================================================================
  @Get('api/admin/media')
  @UseGuards(MediaAuthGuard)
  @RequireMediaRoles('ADMIN')
  async listarMedios(
    @Query('categoria') categoria?: string,
    @Query('eleccion_id') eleccion_id?: string,
    @Query('entidad_tipo') entidad_tipo?: string,
    @Query('solo_sin_uso') solo_sin_uso?: string,
    @Query('q') q?: string,
  ) {
    return this.queryService.listar({
      categoria,
      eleccion_id,
      entidad_tipo,
      solo_sin_uso: solo_sin_uso === 'true' || solo_sin_uso === '1',
      q,
    });
  }

  @Put('api/admin/media/institucion/configuracion')
  @UseGuards(MediaAuthGuard)
  @RequireMediaRoles('ADMIN')
  async actualizarConfiguracionInstitucional(
    @Body() dto: UpdateInstitucionMediaDto,
    @Req() req: { actor: VerifiedActor },
    @Ip() ip: string,
  ) {
    return this.queryService.actualizarConfiguracionInstitucional(dto, req.actor, ip);
  }

  @Get('api/admin/media/:id')
  @UseGuards(MediaAuthGuard)
  @RequireMediaRoles('ADMIN')
  async obtenerDetalle(@Param('id') id: string) {
    return this.queryService.obtenerPorId(id);
  }

  @Get('api/admin/media/:id/signed-url')
  @UseGuards(MediaAuthGuard)
  @RequireMediaRoles('ADMIN', 'DOCENTE')
  async obtenerUrlFirmada(
    @Param('id') id: string,
    @Req() req: { actor: VerifiedActor },
  ) {
    return this.queryService.generarUrlFirmada(id, req.actor);
  }

  @Post('api/admin/media/upload')
  @UseGuards(MediaAuthGuard)
  @RequireMediaRoles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async subirImagen(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadMediaMetadataDto,
    @Req() req: { actor: VerifiedActor },
    @Ip() ip: string,
  ) {
    return this.uploadService.uploadImage({
      file: file as UploadedBinaryFile | undefined,
      dto,
      actor: req.actor,
      ip,
    });
  }

  @Put('api/admin/media/:id/replace')
  @UseGuards(MediaAuthGuard)
  @RequireMediaRoles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async reemplazarImagen(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: { actor: VerifiedActor },
    @Ip() ip: string,
  ) {
    return this.updateService.replaceImage({
      mediaId: id,
      file: file as UploadedBinaryFile | undefined,
      actor: req.actor,
      ip,
    });
  }

  @Patch('api/admin/media/:id')
  @UseGuards(MediaAuthGuard)
  @RequireMediaRoles('ADMIN')
  async actualizarMetadatos(
    @Param('id') id: string,
    @Body() dto: UpdateMediaDto,
    @Req() req: { actor: VerifiedActor },
    @Ip() ip: string,
  ) {
    return this.updateService.updateMetadata({
      mediaId: id,
      dto,
      actor: req.actor,
      ip,
    });
  }

  @Delete('api/admin/media/:id')
  @UseGuards(MediaAuthGuard)
  @RequireMediaRoles('ADMIN')
  async eliminarImagen(
    @Param('id') id: string,
    @Query('forzar') forzar: string | undefined,
    @Req() req: { actor: VerifiedActor },
    @Ip() ip: string,
  ) {
    return this.deleteService.deleteImage({
      mediaId: id,
      forzar: forzar === 'true' || forzar === '1',
      actor: req.actor,
      ip,
    });
  }

  // =========================================================================
  // DOCENTE: Gestión segura del propio avatar privado (URL firmada)
  // =========================================================================
  @Get('api/docente/media/avatar')
  @UseGuards(MediaAuthGuard)
  @RequireMediaRoles('DOCENTE')
  async obtenerMiAvatar(@Req() req: { actor: VerifiedActor }) {
    if (!req.actor.docenteId) {
      throw new BadRequestException('Identificador de docente ausente en el token.');
    }

    const docente = await this.prisma.docente.findUnique({
      where: { id: req.actor.docenteId },
      select: { id: true, username: true, avatar_media_id: true },
    });

    if (!docente?.avatar_media_id) {
      return { tiene_avatar: false, url: null, media: null };
    }

    const media = await this.queryService.obtenerPorId(docente.avatar_media_id);
    return {
      tiene_avatar: true,
      url: media.url_visualizacion,
      media,
    };
  }

  @Post('api/docente/media/avatar')
  @UseGuards(MediaAuthGuard)
  @RequireMediaRoles('DOCENTE')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async subirMiAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: { actor: VerifiedActor },
    @Ip() ip: string,
  ) {
    if (!req.actor.docenteId) {
      throw new BadRequestException('Identificador de docente ausente en el token.');
    }

    const docente = await this.prisma.docente.findUnique({
      where: { id: req.actor.docenteId },
      select: { id: true, eleccion_id: true, avatar_media_id: true },
    });

    if (!docente) {
      throw new BadRequestException('Docente no encontrado.');
    }

    // Si ya tenía avatar privado, reemplazarlo limpiamente en lugar de acumular huérfanos
    if (docente.avatar_media_id) {
      return this.updateService.replaceImage({
        mediaId: docente.avatar_media_id,
        file: file as UploadedBinaryFile | undefined,
        actor: req.actor,
        ip,
      });
    }

    return this.uploadService.uploadImage({
      file: file as UploadedBinaryFile | undefined,
      dto: {
        categoria: 'usuarios',
        entidad_tipo: 'docente',
        entidad_id: docente.id,
        eleccion_id: docente.eleccion_id,
        alt_text: `Foto de perfil docente ${req.actor.username}`,
      },
      actor: req.actor,
      ip,
    });
  }

  @Delete('api/docente/media/avatar')
  @UseGuards(MediaAuthGuard)
  @RequireMediaRoles('DOCENTE')
  async eliminarMiAvatar(
    @Req() req: { actor: VerifiedActor },
    @Ip() ip: string,
  ) {
    if (!req.actor.docenteId) {
      throw new BadRequestException('Identificador de docente ausente en el token.');
    }

    const docente = await this.prisma.docente.findUnique({
      where: { id: req.actor.docenteId },
      select: { avatar_media_id: true },
    });

    if (!docente?.avatar_media_id) {
      return { success: true, message: 'No tienes un avatar registrado actualmente.' };
    }

    return this.deleteService.deleteImage({
      mediaId: docente.avatar_media_id,
      forzar: true,
      actor: req.actor,
      ip,
    });
  }
}

