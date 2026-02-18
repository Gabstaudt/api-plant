import { Body, Controller, Delete, Get, Param, Patch, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { UsersService } from './users.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: { userId: number }) {
    return this.service.findOne(user.userId);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: { userId: number }, @Body() body: UpdateUserDto) {
    return this.service.update(user.userId, {
      fullName: body.fullName,
      email: body.email,
      dateOfBirth: body.dateOfBirth,
    });
  }

  // ADMIN
  @Roles('ADMIN', 'ADMIN_MASTER')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles('ADMIN', 'ADMIN_MASTER')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('ADMIN', 'ADMIN_MASTER')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateUserDto) {
    return this.service.update(id, body);
  }

  @Roles('ADMIN', 'ADMIN_MASTER')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
