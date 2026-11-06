import { createFileRoute } from '@tanstack/react-router';

import { MyWorks } from '@/blocks/my-works';

export const Route = createFileRoute('/settings/works')({ component: MyWorks });
