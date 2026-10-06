import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';
import { EventStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  // All fields from CreateEventDto are optional here
  // Plus status and cancellationReason for updates
  @ApiPropertyOptional({ enum: EventStatus, example: EventStatus.PUBLISHED })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ example: 'Event cancelled due to weather' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}