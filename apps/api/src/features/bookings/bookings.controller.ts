import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  type Booking,
  type BookingDetail,
  type CancelBookingRequest,
  cancelBookingRequestSchema,
  type CreateBookingRequest,
  createBookingRequestSchema,
  type CreateBookingResponse,
  type ExtendBookingRequest,
  extendBookingRequestSchema,
  type ListMyBookingsQuery,
  listMyBookingsQuerySchema,
  type Paginated,
  type Payment,
  type QuoteRequest,
  quoteRequestSchema,
  type QuoteResponse,
  type SessionPayload,
} from '@parkap/shared';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { SessionGuard } from '../../common/auth/session.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BookingsService } from './bookings.service';

/** HTTP only - parse, delegate, serialise. No logic here. */
@Controller('bookings')
@UseGuards(SessionGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('quote')
  quote(@Body(new ZodValidationPipe(quoteRequestSchema)) body: QuoteRequest): Promise<QuoteResponse> {
    return this.bookingsService.quote(body);
  }

  @Post()
  create(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(createBookingRequestSchema)) body: CreateBookingRequest,
  ): Promise<CreateBookingResponse> {
    return this.bookingsService.create(user.sub, body);
  }

  @Get('me')
  listMine(
    @CurrentUser() user: SessionPayload,
    @Query(new ZodValidationPipe(listMyBookingsQuerySchema)) query: ListMyBookingsQuery,
  ): Promise<Paginated<Booking>> {
    return this.bookingsService.listMine(user.sub, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: SessionPayload, @Param('id') id: string): Promise<BookingDetail> {
    return this.bookingsService.getById(user.sub, user.role, id);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: SessionPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelBookingRequestSchema)) body: CancelBookingRequest,
  ): Promise<Booking> {
    return this.bookingsService.cancel(user.sub, id, body);
  }

  @Post(':id/extend')
  extend(
    @CurrentUser() user: SessionPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(extendBookingRequestSchema)) body: ExtendBookingRequest,
  ): Promise<{ booking: Booking; payment: Payment }> {
    return this.bookingsService.extend(user.sub, id, body);
  }
}
