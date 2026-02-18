/**
 * API Keys Management Page
 * Terminal-style interface for managing CostShield API keys
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Copy, Plus, Trash2, Eye, EyeOff, Loader2, Key, Check, AlertTriangle } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  budget_id: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/keys');
      
      if (!response?.ok) {
        throw new Error('Failed to fetch API keys');
      }

      const data = await response?.json();
      setKeys(data?.keys ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName?.trim()) {
      setError('Please enter a name for the API key');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (!response?.ok) {
        const data = await response?.json();
        throw new Error(data?.error ?? 'Failed to create API key');
      }

      const data = await response?.json();
      setNewKey(data?.key ?? null);
      setShowNewKey(true);
      setNewKeyName('');
      await fetchKeys();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response?.ok) {
        throw new Error('Failed to delete API key');
      }

      await fetchKeys();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete API key');
    }
  };

  const handleCopyKey = (key: string, keyId?: string) => {
    navigator.clipboard.writeText(key);
    if (keyId) {
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet?.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const maskKey = (key: string) => {
    if (!key) return '•'.repeat(32);
    if (key?.startsWith('cs_live_')) {
      return `cs_live_${'•'.repeat(24)}`;
    }
    return `${key?.substring(0, 8) ?? ''}${'•'.repeat(Math.max(0, (key?.length ?? 0) - 8))}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) ?? dateString;
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-dev-muted font-mono">
            <span className="text-dev-accent">~</span>
            <span>/api-keys</span>
          </div>
          <h1 className="text-2xl font-semibold text-dev-text">API Keys</h1>
          <p className="text-sm text-dev-muted">Manage authentication keys for the CostShield proxy</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-dev-accent text-dev-bg hover:bg-dev-accent/90 font-mono text-sm rounded-sm">
              <Plus className="mr-2 h-4 w-4" />
              New Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-dev-surface border-dev-border">
            <DialogHeader>
              <DialogTitle className="text-dev-text font-mono">Create API Key</DialogTitle>
              <DialogDescription className="text-dev-muted">
                Give your key a name for identification.
              </DialogDescription>
            </DialogHeader>
            {!newKey ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="key-name" className="text-dev-text text-sm font-mono">Key Name</Label>
                  <Input
                    id="key-name"
                    placeholder="production, development, staging..."
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e?.target?.value ?? '')}
                    disabled={creating}
                    className="bg-dev-bg border-dev-border text-dev-text font-mono placeholder:text-dev-muted/50"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-sm text-sm text-red-400 font-mono">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setNewKeyName('');
                      setError(null);
                    }}
                    disabled={creating}
                    className="border-dev-border text-dev-muted hover:text-dev-text"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateKey} 
                    disabled={creating || !newKeyName?.trim()}
                    className="bg-dev-accent text-dev-bg hover:bg-dev-accent/90 font-mono"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Key'
                    )}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-500">Save this key now</p>
                      <p className="text-dev-muted mt-1">You won't be able to see it again.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-dev-text text-sm font-mono">Your API Key</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-dev-bg border border-dev-border rounded-sm px-3 py-2 font-mono text-sm text-dev-accent overflow-x-auto">
                        {showNewKey ? newKey : maskKey(newKey ?? '')}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowNewKey(!showNewKey)}
                        className="border-dev-border text-dev-muted hover:text-dev-text"
                      >
                        {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyKey(newKey ?? '')}
                        className="border-dev-border text-dev-muted hover:text-dev-accent"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setNewKey(null);
                      setShowNewKey(false);
                      setNewKeyName('');
                      setError(null);
                    }}
                    className="bg-dev-accent text-dev-bg hover:bg-dev-accent/90 font-mono"
                  >
                    Done
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {error && !isCreateDialogOpen && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-sm text-sm text-red-400 font-mono">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Keys List */}
      <div className="card-terminal">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-dev-border">
          <Key className="h-4 w-4 text-dev-accent" />
          <span className="text-sm font-mono text-dev-muted uppercase tracking-wide">Active Keys</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-dev-muted animate-spin" />
          </div>
        ) : (keys?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Key className="h-8 w-8 text-dev-border mb-3" />
            <p className="text-dev-muted text-sm">No API keys yet</p>
            <p className="text-dev-muted/60 text-xs mt-1 font-mono">Create your first key to start using the proxy</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys?.map((key) => (
              <div 
                key={key?.id}
                className="flex items-center gap-3 px-3 py-3 bg-dev-bg rounded-sm border border-dev-border/50 hover:border-dev-border transition-colors"
              >
                {/* Status indicator */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${key?.is_active ? 'bg-dev-accent' : 'bg-dev-muted'}`} />

                {/* Name */}
                <div className="w-32 flex-shrink-0">
                  <span className="font-mono text-sm text-dev-text truncate block">{key?.name ?? 'Unnamed'}</span>
                </div>

                {/* Key */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-dev-muted truncate">
                      {visibleKeys?.has(key?.id) ? key?.key_prefix : maskKey(key?.key_prefix)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-dev-muted hover:text-dev-text"
                      onClick={() => toggleKeyVisibility(key?.id)}
                    >
                      {visibleKeys?.has(key?.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-dev-muted hover:text-dev-accent"
                      onClick={() => handleCopyKey(key?.key_prefix, key?.id)}
                    >
                      {copiedKey === key?.id ? (
                        <Check className="h-3 w-3 text-dev-accent" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Last used */}
                <div className="hidden md:block w-32 text-right flex-shrink-0">
                  <span className="font-mono text-xs text-dev-muted">{formatDate(key?.last_used_at)}</span>
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteKey(key?.id)}
                  className="h-8 w-8 text-dev-muted hover:text-red-500 hover:bg-red-500/10 flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )) ?? null}
          </div>
        )}
      </div>
    </div>
  );
}
