import type { MojoContext } from '@mojojs/core';

import { RecoveryHub } from '../models/recoveryHub.js';
import { Users } from '../models/users.js';

export default class Controller {
  async loginPage(ctx: MojoContext): Promise<void> {
    const users = (ctx.models.users as Users).listUsers();
    await ctx.render({ view: 'auth/loginPage', layout: 'default' }, {
      title: 'Test User Login',
      active: 'login',
      users,
    });
  }

  async loginAction(ctx: MojoContext): Promise<void> {
    const params = await ctx.params();
    const action = params.get('action');
    const usersModel = ctx.models.users as Users;
    const hubModel = ctx.models.recoveryHub as RecoveryHub;
    const session = await ctx.session();

    if (action === 'select') {
      const userId = Number(params.get('userId'));
      const user = usersModel.userWithId(userId);
      if (user == null) {
        await ctx.redirectTo('/login');
        return;
      }

      session.userId = Number(user.id);
      session.profileName = user.profileName;
    } else if (action === 'create') {
      const profileName = params.get('profileName')?.trim();
      if (!profileName) {
        await ctx.redirectTo('/login');
        return;
      }

      const user = usersModel.newUser({ profileName });
      hubModel.createDefaultContext(Number(user.id));
      session.userId = Number(user.id);
      session.profileName = user.profileName;
    }

    await ctx.redirectTo('/?session=1');
  }

  async logout(ctx: MojoContext): Promise<void> {
    const session = await ctx.session();
    delete session.userId;
    delete session.profileName;
    await ctx.redirectTo('/login');
  }
}
