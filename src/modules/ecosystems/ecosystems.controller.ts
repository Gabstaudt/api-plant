import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EcosystemsService } from './ecosystems.service';
import { ApproveRequestDto } from './dto/approve-request.dto';

@ApiTags('ecosystems')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('ecosystems')
export class EcosystemsController {
  constructor(private readonly service: EcosystemsService) {}

  @Get('me')
  me(@CurrentUser() user: { userId: number }) {
    return this.service.getMyEcosystem(user.userId);
  }

  @Roles('ADMIN', 'ADMIN_MASTER')
  @Get('users')
  listUsers(@CurrentUser() user: { userId: number }) {
    return this.service.listUsers(user.userId);
  }

  @Roles('ADMIN', 'ADMIN_MASTER')
  @Get('requests')
  listRequests(@CurrentUser() user: { userId: number }) {
    return this.service.listRequests(user.userId);
  }

  @Roles('ADMIN', 'ADMIN_MASTER')
  @Patch('requests/:id/approve')
  approve(
    @CurrentUser() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApproveRequestDto,
  ) {
    return this.service.approveRequest(user.userId, id, body.role);
  }

  @Roles('ADMIN', 'ADMIN_MASTER')
  @Patch('requests/:id/reject')
  reject(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.rejectRequest(user.userId, id);
  }
}
