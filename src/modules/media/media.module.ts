import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { MediaController } from './media.controller';
import { MediaAuthGuard } from './guards/media-auth.guard';
import { ImageValidationService } from './services/image-validation.service';
import { SupabaseDiagnosticsService } from './services/supabase-diagnostics.service';
import { ImageUploadService } from './services/image-upload.service';
import { ImageUpdateService } from './services/image-update.service';
import { ImageDeleteService } from './services/image-delete.service';
import { MediaQueryService } from './services/media-query.service';
import { MediaEntityLinkerHelper } from './services/media-entity-linker.helper';

@Module({
  imports: [AuditoriaModule],
  controllers: [MediaController],
  providers: [
    MediaAuthGuard,
    ImageValidationService,
    SupabaseDiagnosticsService,
    MediaEntityLinkerHelper,
    ImageUploadService,
    ImageUpdateService,
    ImageDeleteService,
    MediaQueryService,
  ],
  exports: [
    ImageValidationService,
    SupabaseDiagnosticsService,
    MediaEntityLinkerHelper,
    MediaQueryService,
  ],
})
export class MediaModule {}
