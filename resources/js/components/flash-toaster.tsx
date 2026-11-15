import { useAppearance } from '@/hooks/use-appearance';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';

/** Shows the server's flash messages (success / error) as toasts. */
export function FlashToaster() {
    const { flash } = usePage<SharedData>().props;
    const { appearance } = useAppearance();

    useEffect(() => {
        // `flash` is a new object on every response, so repeated messages still show.
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    return <Toaster position="bottom-right" richColors closeButton theme={appearance} />;
}
