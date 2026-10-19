import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
import { resolveWorkflowNextAction } from '@/lib/workflowNavigation';
import AlertToast, { type AlertToastMessage } from './AlertToast';

export default function WorkflowFlashToast() {
    const page = usePage<PageProps>();
    const { auth, flash } = page.props;
    const [toast, setToast] = useState<AlertToastMessage | null>(null);
    const role = auth.user.primary_role ?? auth.user.roles?.[0];

    useEffect(() => {
        if (flash?.error) {
            setToast({
                variant: 'error',
                message: flash.error,
            });

            return;
        }

        if (!flash?.success || flash.created_work_order || flash.submitted_request_id || flash.submitted_request_number) {
            setToast(null);

            return;
        }

        setToast({
            variant: 'success',
            message: flash.success,
            action: resolveWorkflowNextAction(
                page.url,
                role,
                flash.success,
            ),
        });
    }, [flash, page.url, role]);

    if (!toast) {
        return null;
    }

    return <AlertToast {...toast} onClose={() => setToast(null)} />;
}
