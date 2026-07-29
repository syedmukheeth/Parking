import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  type ExitTicketRequest,
  exitTicketRequestSchema,
  type ExitTicketResponse,
  type SessionPayload,
  type TicketQrResponse,
  type VerifyTicketRequest,
  verifyTicketRequestSchema,
  type VerifyTicketResponse,
} from '@parkap/shared';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { SessionGuard } from '../../common/auth/session.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(SessionGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get(':bookingId/qr')
  getQr(
    @CurrentUser() user: SessionPayload,
    @Param('bookingId') bookingId: string,
  ): Promise<TicketQrResponse> {
    return this.ticketsService.getQr(user.sub, bookingId);
  }

  @UseGuards(RolesGuard)
  @Roles('OPERATOR', 'ADMIN')
  @Post('verify')
  verify(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(verifyTicketRequestSchema)) body: VerifyTicketRequest,
  ): Promise<VerifyTicketResponse> {
    return this.ticketsService.verify(user.sub, body.token);
  }

  @UseGuards(RolesGuard)
  @Roles('OPERATOR', 'ADMIN')
  @Post('exit')
  exit(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(exitTicketRequestSchema)) body: ExitTicketRequest,
  ): Promise<ExitTicketResponse> {
    return this.ticketsService.exit(user.sub, body.token);
  }
}
