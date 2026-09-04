import { Injectable } from '@nestjs/common';
import { SETTING_KEYS } from '@ptg/config';
import type { DeliveryMethod, ShippingMethodDto } from '@ptg/types';
import { SettingsService } from '../settings/settings.service.js';

const DEFAULT_METHODS: Array<Omit<ShippingMethodDto, 'price'> & { priceMinor: number }> = [
  { id: 'standard', code: 'STANDARD', name: 'Standard shipping', description: '3-7 business days', priceMinor: 0, estimatedDaysMin: 3, estimatedDaysMax: 7 },
  { id: 'express', code: 'EXPRESS', name: 'Express shipping', description: '1-2 business days', priceMinor: 1500, estimatedDaysMin: 1, estimatedDaysMax: 2 },
  { id: 'pickup', code: 'PICKUP', name: 'Store pickup', description: 'Ready within 24 hours', priceMinor: 0, estimatedDaysMin: 0, estimatedDaysMax: 1 },
];

/** Shipping methods and prices are admin-configurable (SystemSetting), not hard-coded business rules. */
@Injectable()
export class ShippingService {
  constructor(private readonly settings: SettingsService) {}

  async listMethods(currency: string): Promise<ShippingMethodDto[]> {
    const configured = await this.settings.get<typeof DEFAULT_METHODS | null>(SETTING_KEYS.shippingMethods, null);
    const methods = configured ?? DEFAULT_METHODS;
    return methods.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      description: m.description,
      price: { amountMinor: m.priceMinor, currency: currency as ShippingMethodDto['price']['currency'] },
      estimatedDaysMin: m.estimatedDaysMin,
      estimatedDaysMax: m.estimatedDaysMax,
    }));
  }

  async getPriceMinor(deliveryMethod: DeliveryMethod, currency: string): Promise<number> {
    const methods = await this.listMethods(currency);
    const match = methods.find((m) => m.code === deliveryMethod);
    return match?.price.amountMinor ?? 0;
  }
}
