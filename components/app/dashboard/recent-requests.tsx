/**
 * Recent Requests Component
 * Simplified table showing the last 5 API requests
 * Reference: Section 22 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface RecentRequest {
  id: string;
  model: string;
  endpoint: string;
  cost: number;
  status_code: number;
  created_at: string;
}

interface RecentRequestsProps {
  requests: RecentRequest[];
}

export function RecentRequests({ requests }: RecentRequestsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(6)}`;
  };

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
          <CardDescription>Your latest API calls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No requests yet</p>
            <p className="text-sm">Start making API calls to see them here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>Your latest API calls</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/usage">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Time</TableHead>
                <TableHead className="min-w-[100px]">Model</TableHead>
                <TableHead className="min-w-[80px] hidden sm:table-cell">Endpoint</TableHead>
                <TableHead className="min-w-[80px]">Cost</TableHead>
                <TableHead className="min-w-[70px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                    {formatDate(request.created_at)}
                  </TableCell>
                  <TableCell className="font-mono text-sm whitespace-nowrap">{request.model}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap hidden sm:table-cell">{request.endpoint}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{formatCost(request.cost)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        request.status_code >= 200 && request.status_code < 300
                          ? 'default'
                          : 'destructive'
                      }
                    >
                      {request.status_code}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
