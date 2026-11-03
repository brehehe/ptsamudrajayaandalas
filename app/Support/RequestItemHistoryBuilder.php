<?php

namespace App\Support;

use App\Models\RequestHistory;
use App\Models\RequestItem;
use App\Models\ShipRequest;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class RequestItemHistoryBuilder
{
    /**
     * Attach submission history attributes to all items across a collection of ShipRequests.
     *
     * @param  Collection<int, ShipRequest>  $requests
     */
    public static function attachHistoryToRequests(Collection $requests): void
    {
        foreach ($requests as $request) {
            if ($request instanceof ShipRequest) {
                $request->loadMissing(['histories', 'items']);
                self::attachHistoryToRequestItems($request);
            }
        }
    }

    /**
     * Attach history to items within a single request.
     */
    public static function attachHistoryToRequestItems(ShipRequest $request): void
    {
        $histories = $request->histories->sortBy('action_date')->values();

        foreach ($request->items as $item) {
            $data = self::buildItemHistory($item, $request, $histories);

            $item->setAttribute('submission_count', $data['submission_count']);
            $item->setAttribute('submission_round_label', $data['submission_round_label']);
            $item->setAttribute('was_previously_unselected', $data['was_previously_unselected']);
            $item->setAttribute('submission_history', $data['submission_history']);
            $item->setAttribute('latest_submission_date', $data['latest_submission_date']);
            $item->setAttribute('history_summary', $data['history_summary']);
        }
    }

    /**
     * Build the history for a single RequestItem.
     *
     * @param  Collection<int, RequestHistory>  $histories
     * @return array<string, mixed>
     */
    public static function buildItemHistory(RequestItem $item, ShipRequest $request, Collection $histories): array
    {
        $rounds = [];
        $currentRoundIndex = null;
        $roundNumber = 0;

        foreach ($histories as $history) {
            $snapshot = self::findItemInSnapshot($history->items_snapshot, $item);

            // 1. Submission actions (started by Admin)
            if (in_array($history->action, ['submitted_to_director', 'resubmitted_to_director'], true)) {
                if ($snapshot !== null || empty($history->items_snapshot)) {
                    $roundNumber++;
                    $dateStr = $history->submission_date
                        ? Carbon::parse($history->submission_date)->translatedFormat('d M Y')
                        : ($history->action_date ? Carbon::parse($history->action_date)->translatedFormat('d M Y') : '-');

                    $rounds[] = [
                        'round' => $roundNumber,
                        'round_label' => $roundNumber === 1 ? 'Pengajuan Pertama' : ($roundNumber === 2 ? 'Pengajuan Kedua' : "Pengajuan ke-{$roundNumber}"),
                        'submission_date' => $dateStr,
                        'submission_timestamp' => $history->action_date?->toIso8601String(),
                        'submitted_by' => $history->actor_name ?? 'Bu Titik (Admin)',
                        'actor_role' => $history->actor_role ?? 'Admin',
                        'admin_notes' => $history->notes,
                        'hpp_price' => (float) ($snapshot['hpp_price'] ?? $item->hpp_price),
                        'decision_status' => null,
                        'decision_label' => null,
                        'decision_date' => null,
                        'decision_by' => null,
                        'director_notes' => null,
                    ];
                    $currentRoundIndex = count($rounds) - 1;
                }
            }
            // 2. Director decision actions
            elseif (in_array($history->action, ['director_approved', 'director_partial_approval', 'director_rejected', 'director_returned_to_admin'], true)) {
                if ($currentRoundIndex !== null && ($snapshot !== null || empty($history->items_snapshot))) {
                    $itemDirectorStatus = $snapshot['director_status'] ?? null;
                    $itemStatus = $snapshot['status'] ?? null;
                    $decisionDateStr = $history->action_date ? Carbon::parse($history->action_date)->translatedFormat('d M Y H:i') : null;

                    if ($itemDirectorStatus === 'approved' || $itemStatus === 'disetujui') {
                        $rounds[$currentRoundIndex]['decision_status'] = 'approved';
                        $rounds[$currentRoundIndex]['decision_label'] = 'Disetujui Pak Ryan';
                    } elseif ($itemDirectorStatus === 'rejected' || $itemStatus === 'ditolak') {
                        $rounds[$currentRoundIndex]['decision_status'] = 'rejected';
                        $rounds[$currentRoundIndex]['decision_label'] = 'Ditolak Pak Ryan';
                    } else {
                        $rounds[$currentRoundIndex]['decision_status'] = 'unselected';
                        $rounds[$currentRoundIndex]['decision_label'] = 'Belum dipilih / dikembalikan ke Admin';
                    }

                    $rounds[$currentRoundIndex]['decision_date'] = $decisionDateStr;
                    $rounds[$currentRoundIndex]['decision_by'] = $history->actor_name ?? 'Pak Ryan (Direktur)';
                    $rounds[$currentRoundIndex]['director_notes'] = $snapshot['director_notes'] ?? $history->notes;
                }
            }
        }

        // If no history records found for this item, synthesize from item's status
        if (empty($rounds)) {
            $dateStr = $item->required_date
                ? Carbon::parse($item->required_date)->translatedFormat('d M Y')
                : ($request->request_date ? Carbon::parse($request->request_date)->translatedFormat('d M Y') : $item->created_at?->translatedFormat('d M Y'));

            $isSubmitted = in_array($item->status, ['diajukan_ke_direktur', 'disetujui', 'selesai'], true)
                || in_array($item->director_status, ['approved', 'rejected'], true)
                || ! empty($item->director_notes)
                || $request->forwarded_to_director_at !== null;

            if ($isSubmitted) {
                $decisionStatus = match ($item->director_status) {
                    'approved' => 'approved',
                    'rejected' => 'rejected',
                    default => ($item->status === 'diajukan_ke_direktur' ? 'pending' : 'unselected'),
                };

                $decisionLabel = match ($decisionStatus) {
                    'approved' => 'Disetujui Pak Ryan',
                    'rejected' => 'Ditolak Pak Ryan',
                    'pending' => 'Menunggu persetujuan Pak Ryan',
                    default => 'Belum dipilih / dikembalikan ke Admin',
                };

                $rounds[] = [
                    'round' => 1,
                    'round_label' => 'Pengajuan Pertama',
                    'submission_date' => $dateStr ?: '-',
                    'submission_timestamp' => $item->created_at?->toIso8601String(),
                    'submitted_by' => 'Bu Titik (Admin)',
                    'actor_role' => 'Admin',
                    'admin_notes' => null,
                    'hpp_price' => (float) $item->hpp_price,
                    'decision_status' => $decisionStatus,
                    'decision_label' => $decisionLabel,
                    'decision_date' => $item->director_reviewed_at ? Carbon::parse($item->director_reviewed_at)->translatedFormat('d M Y') : null,
                    'decision_by' => 'Pak Ryan (Direktur)',
                    'director_notes' => $item->director_notes,
                ];
            } else {
                $rounds[] = [
                    'round' => 1,
                    'round_label' => 'Draft Pengajuan',
                    'submission_date' => $dateStr ?: '-',
                    'submission_timestamp' => $item->created_at?->toIso8601String(),
                    'submitted_by' => 'Bu Titik (Admin)',
                    'actor_role' => 'Admin',
                    'admin_notes' => null,
                    'hpp_price' => (float) $item->hpp_price,
                    'decision_status' => 'draft',
                    'decision_label' => 'Belum diajukan ke Direktur',
                    'decision_date' => null,
                    'decision_by' => null,
                    'director_notes' => null,
                ];
            }
        } else {
            // Check latest round: if decision_status is still null, resolve with current item state
            $lastIndex = count($rounds) - 1;
            if ($rounds[$lastIndex]['decision_status'] === null) {
                if ($item->status === 'diajukan_ke_direktur') {
                    $rounds[$lastIndex]['decision_status'] = 'pending';
                    $rounds[$lastIndex]['decision_label'] = 'Menunggu persetujuan Pak Ryan';
                } elseif ($item->director_status === 'approved' || $item->status === 'disetujui' || $item->status === 'selesai') {
                    $rounds[$lastIndex]['decision_status'] = 'approved';
                    $rounds[$lastIndex]['decision_label'] = 'Disetujui Pak Ryan';
                    $rounds[$lastIndex]['decision_by'] = 'Pak Ryan (Direktur)';
                } elseif ($item->director_status === 'rejected' || $item->status === 'ditolak') {
                    $rounds[$lastIndex]['decision_status'] = 'rejected';
                    $rounds[$lastIndex]['decision_label'] = 'Ditolak Pak Ryan';
                    $rounds[$lastIndex]['decision_by'] = 'Pak Ryan (Direktur)';
                } else {
                    $rounds[$lastIndex]['decision_status'] = 'unselected';
                    $rounds[$lastIndex]['decision_label'] = 'Belum dipilih / dikembalikan ke Admin';
                    $rounds[$lastIndex]['director_notes'] = $item->director_notes;
                }
            }
        }

        $submissionCount = count($rounds);
        $wasPreviouslyUnselected = false;

        if ($submissionCount > 1) {
            $wasPreviouslyUnselected = true;
        } elseif ($submissionCount === 1 && ($rounds[0]['decision_status'] === 'unselected' || ! empty($item->director_notes))) {
            $wasPreviouslyUnselected = true;
        }

        $latestRound = $rounds[count($rounds) - 1];
        $latestSubmissionDate = $latestRound['submission_date'] ?? null;

        $submissionRoundLabel = match ($submissionCount) {
            0 => 'Draft Pengajuan',
            1 => ($rounds[0]['decision_status'] === 'draft' ? 'Draft Pengajuan' : 'Pengajuan Pertama'),
            2 => 'Pengajuan Kedua'.($wasPreviouslyUnselected ? ' (Diajukan Ulang)' : ''),
            default => "Pengajuan ke-{$submissionCount}".($wasPreviouslyUnselected ? ' (Diajukan Ulang)' : ''),
        };

        $historySummary = '';
        if ($wasPreviouslyUnselected && $submissionCount >= 2) {
            $firstRoundDate = $rounds[0]['submission_date'] ?? '';
            $historySummary = "Pengajuan ke-{$submissionCount} · Belum terpilih pada pengajuan sebelumnya ({$firstRoundDate})";
        } elseif ($wasPreviouslyUnselected && $submissionCount === 1 && $rounds[0]['decision_status'] === 'unselected') {
            $historySummary = 'Pengajuan Pertama · Belum dipilih Direktur (menunggu diajukan ulang)';
        } else {
            $historySummary = $submissionRoundLabel.($latestSubmissionDate ? " · {$latestSubmissionDate}" : '');
        }

        return [
            'submission_count' => $submissionCount,
            'submission_round_label' => $submissionRoundLabel,
            'was_previously_unselected' => $wasPreviouslyUnselected,
            'submission_history' => $rounds,
            'latest_submission_date' => $latestSubmissionDate,
            'history_summary' => $historySummary,
        ];
    }

    private static function findItemInSnapshot(?array $snapshot, RequestItem $item): ?array
    {
        if (empty($snapshot)) {
            return null;
        }

        foreach ($snapshot as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            if (isset($entry['item_id']) && (string) $entry['item_id'] === (string) $item->id) {
                return $entry;
            }

            if (isset($entry['id']) && (string) $entry['id'] === (string) $item->id) {
                return $entry;
            }

            if (isset($entry['item_name']) && trim((string) $entry['item_name']) === trim((string) $item->item_name)) {
                return $entry;
            }
        }

        return null;
    }
}
