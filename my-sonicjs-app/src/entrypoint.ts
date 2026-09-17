import worker from './index';
import { handleEnhancedSeoRequest } from './seo/enhanced';

type RuntimeEnv = Record<string, unknown>;

export default {
  async fetch(request: Request, env: RuntimeEnv, ctx: ExecutionContext) {
    return handleEnhancedSeoRequest(request, env as never, () => worker.fetch(request, env, ctx));
  },

  async scheduled(controller: ScheduledController, env: RuntimeEnv, ctx: ExecutionContext) {
    return worker.scheduled(controller, env, ctx);
  },
};
