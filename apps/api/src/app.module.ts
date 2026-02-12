import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BookingsModule } from './bookings/bookings.module';
import { ContactsModule } from './contacts/contacts.module';
import { EmailModule } from './email/email.module';
import { SeasonsModule } from './seasons/seasons.module';
import { DatePeriodsModule } from './date-periods/date-periods.module';
import { PricingModule } from './pricing/pricing.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ThrottlerModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    BookingsModule,
    ContactsModule,
    EmailModule,
    SeasonsModule,
    DatePeriodsModule,
    PricingModule,
    SettingsModule,
  ],
})
export class AppModule {}
