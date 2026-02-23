import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesService } from './roles.service';
import { CreateRoleProfileDto } from './dto/create-role-profile.dto';
import { UpdateRoleProfileDto } from './dto/update-role-profile.dto';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Roles('ADMIN', 'ADMIN_MASTER')
  @Get()
  list(@CurrentUser() user: { userId: number }) {
    return this.service.list(user.userId);
  }

  @Roles('ADMIN', 'ADMIN_MASTER')
  @Post()
  create(@CurrentUser() user: { userId: number }, @Body() body: CreateRoleProfileDto) {
    return this.service.create(user.userId, body);
  }

  @Roles('ADMIN', 'ADMIN_MASTER')
  @Patch(':id')
  update(
    @CurrentUser() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoleProfileDto,
  ) {
    return this.service.update(user.userId, id, body);
  }

  @Roles('ADMIN', 'ADMIN_MASTER')
  @Delete(':id')
  remove(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user.userId, id);
  }
}
