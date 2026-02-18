/**
 * Recent Requests Component
 * Terminal-style request log display
 */

import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

interface Request {
  id: string;
  model: string;
  endpoint: string;
  cost: number;
  status_code: number;
  created_at: string;
}

interface RecentRequestsProps {
  requests: Request[];
}

export function RecentRequests({ requests }: RecentRequestsProps) {
  const formatTime = (dateString: string) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusIcon = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <CheckCircle className="h-3 w-3 text-dev-accent" />;
    }
    return <XCircle className="h-3 w-3 text-red-500" />;
  };

  if (!requests || requests?.length === 0) {
    return (
      <div className="card-terminal">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-dev-muted" />
          <span className="text-sm font-mono text-dev-muted uppercase tracking-wide">Recent Activity</span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-8 w-8 text-dev-border mb-3" />
          <p className="text-dev-muted text-sm">No requests yet</p>
          <p className="text-dev-muted/60 text-xs mt-1 font-mono">Make your first API call to see activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-terminal">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-dev-cyan" />
          <span className="text-sm font-mono text-dev-muted uppercase tracking-wide">Recent Activity</span>
        </div>
        <Link 
          href="/usage"
          className="text-xs text-dev-accent hover:underline font-mono"
        >
          View all →
        </Link>
      </div>

      <div className="space-y-2">
        {requests?.map((request, index) => (
          <div 
            key={request?.id ?? index}
            className="flex items-center gap-3 px-3 py-2 bg-dev-bg rounded-sm border border-dev-border/50 hover:border-dev-border transition-colors"
          >
            {/* Status indicator */}
            <div className="flex-shrink-0">
              {getStatusIcon(request?.status_code ?? 0)}
            </div>

            {/* Model & Endpoint */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-dev-text truncate">
                  {request?.model ?? 'unknown'}
                </span>
                <span className="text-dev-border">·</span>
                <span className="font-mono text-xs text-dev-muted truncate">
                  {request?.endpoint ?? 'unknown'}
                </span>
              </div>
            </div>

            {/* Cost */}
            <div className="flex-shrink-0 text-right">
              <span className="font-mono text-sm text-dev-accent">
                ${request?.cost?.toFixed(6) ?? '0.000000'}
              </span>
            </div>

            {/* Time */}
            <div className="flex-shrink-0 w-16 text-right">
              <span className="font-mono text-xs text-dev-muted">
                {formatTime(request?.created_at)}
              </span>
            </div>
          </div>
        )) ?? null}
      </div>
    </div>
  );
}
