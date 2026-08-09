import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  type CreateVehicleRequest,
  createVehicleRequestSchema,
  type SessionPayload,
  type UpdateVehicleRequest,
  updateVehicleRequestSchema,
  type Vehicle,
} from '@parkap/shared';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { SessionGuard } from '../../common/auth/session.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { VehiclesService } from './vehicles.service';

/**
 * HTTP only - parse, delegate, serialise. Every route is scoped to the session
 * user; a vehicle id is never trusted on its own.
 */
@UseGuards(SessionGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  list(@CurrentUser() user: SessionPayload): Promise<Vehicle[]> {
    return this.vehiclesService.list(user.sub);
  }

  @Post()
  create(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(createVehicleRequestSchema)) body: CreateVehicleRequest,
  ): Promise<Vehicle> {
    return this.vehiclesService.create(user.sub, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: SessionPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateVehicleRequestSchema)) body: UpdateVehicleRequest,
  ): Promise<Vehicle> {
    return this.vehiclesService.update(user.sub, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: SessionPayload, @Param('id') id: string): Promise<void> {
    return this.vehiclesService.remove(user.sub, id);
  }
}
