import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { BoardsModule } from './boards/boards.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { GroupsModule } from './groups/groups.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { SearchModule } from './search/search.module';
import { MapsModule } from './maps/maps.module';
import { ResourcesModule } from './resources/resources.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    EventsModule,
    BoardsModule,
    InstitutionsModule,
    GroupsModule,
    RecommendationsModule,
    SearchModule,
    MapsModule,
    ResourcesModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}