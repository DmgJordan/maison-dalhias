import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppAgentService } from './whatsapp-agent.service';
import { WhatsAppConversationService } from './whatsapp-conversation.service';
import { BookingsModule } from '../bookings/bookings.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [BookingsModule, PricingModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppAgentService, WhatsAppConversationService],
})
export class WhatsAppModule {}
