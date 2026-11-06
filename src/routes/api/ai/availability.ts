import { createFileRoute } from '@tanstack/react-router';

import { getEmailProvider } from '@/core/auth';
import { worksBucket } from '@/core/storage/works';
import { getAllConfigs } from '@/modules/config/service';
import { respData } from '@/lib/resp';

export const Route = createFileRoute('/api/ai/availability')({
  server: {
    handlers: {
      GET: async () => {
        const configs = await getAllConfigs();
        const storage = !!worksBucket();
        return respData({
          storage,
          email: storage && !!getEmailProvider(configs),
        });
      },
    },
  },
});
