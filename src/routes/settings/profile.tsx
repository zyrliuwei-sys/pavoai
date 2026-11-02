import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';

import { SettingsForm } from './-settings-form';

function SettingsPage() {
  const {
    data: user,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['user-info'],
    queryFn: async () => {
      const data = await apiGet<{
        name?: string;
        email?: string;
        image?: string;
      }>('/api/user/info');
      return data;
    },
    select: (data) => ({
      name: data.name || '',
      email: data.email || '',
      image: data.image || '',
    }),
  });

  if (isError) {
    return (
      <div className="space-y-3 p-6" role="alert">
        <p>{m['settings.profile.load_failed']()}</p>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => refetch()}
        >
          {m['settings.profile.retry']()}
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-muted-foreground p-6">
        {m['settings.profile.loading']()}
      </div>
    );
  }

  return (
    <SettingsForm name={user.name} email={user.email} image={user.image} />
  );
}

export const Route = createFileRoute('/settings/profile')({
  component: SettingsPage,
});
