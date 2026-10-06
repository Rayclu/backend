import { IsString, IsOptional, IsEnum, IsUrl, MaxLength, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType } from '@prisma/client';

export class CreateResourceDto {
  @ApiProperty({ example: 'Event Presentation' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Slides from the keynote' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ResourceType, example: ResourceType.PRESENTATION })
  @IsEnum(ResourceType)
  type: ResourceType;

  @ApiProperty({ example: 'presentation.pdf' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 'https://storage.example.com/presentation.pdf' })
  @IsUrl()
  fileUrl: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: 1024000 })
  @IsOptional()
  fileSize?: number;

  @ApiPropertyOptional({ example: 'https://storage.example.com/thumb.jpg' })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: ['presentation', 'keynote', 'slides'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  boardId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  institutionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;
}