import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IsInt, IsString, Min } from 'class-validator';
import type { CartDto } from '@ptg/types';
import { CurrentUser } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import type { AppConfig } from '../../config/configuration.js';
import { CartService } from './cart.service.js';

class AddCartItemDto {
  @IsString()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  quantity!: number;
}

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  private currency(): string {
    return this.config.get('platform', { infer: true }).defaultCurrency;
  }

  @Get()
  async get(@CurrentUser() user: RequestUser): Promise<CartDto> {
    return this.cartService.getCart(user.id, this.currency());
  }

  @Post('items')
  async addItem(@CurrentUser() user: RequestUser, @Body() dto: AddCartItemDto): Promise<CartDto> {
    return this.cartService.addItem(user.id, this.currency(), dto.variantId, dto.quantity);
  }

  @Patch('items/:id')
  async updateItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateCartItemDto): Promise<CartDto> {
    return this.cartService.updateItem(user.id, this.currency(), id, dto.quantity);
  }

  @Delete('items/:id')
  async removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<CartDto> {
    return this.cartService.removeItem(user.id, this.currency(), id);
  }

  @Delete()
  async clear(@CurrentUser() user: RequestUser): Promise<CartDto> {
    return this.cartService.clear(user.id, this.currency());
  }
}
