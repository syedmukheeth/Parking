import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { FavouritesController } from './favourites.controller';
import { FavouritesRepository } from './favourites.repository';
import { FavouritesService } from './favourites.service';

@Module({
  imports: [LocationsModule],
  controllers: [FavouritesController],
  providers: [FavouritesService, FavouritesRepository],
  exports: [FavouritesService],
})
export class FavouritesModule {}
