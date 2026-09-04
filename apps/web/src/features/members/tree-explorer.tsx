import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { MEMBERSHIP_STATUSES, type MembershipStatus, type TreeKind, type TreeNodeDto } from '@ptg/types';
import { Card, SearchBar, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, TreeNode } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { useTree } from './api';

export interface TreeExplorerProps {
  kind: TreeKind;
  title: string;
}

export function TreeExplorer({ kind, title }: TreeExplorerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState('');
  const [depth, setDepth] = React.useState(3);
  const [status, setStatus] = React.useState<MembershipStatus | undefined>();
  const [selected, setSelected] = React.useState<TreeNodeDto['member'] | null>(null);

  const treeQuery = useTree(kind, { depth, search: search || undefined, status });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <div className="flex items-center gap-2">
          <SearchBar value={search} onChange={setSearch} className="w-48" />
          <Select value={status ?? 'ALL'} onValueChange={(v) => setStatus(v === 'ALL' ? undefined : (v as MembershipStatus))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {MEMBERSHIP_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(depth)} onValueChange={(v) => setDepth(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2, 3, 4, 5, 6].map((d) => (
                <SelectItem key={d} value={String(d)}>
                  Depth {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <QueryState isLoading={treeQuery.isLoading} isError={treeQuery.isError} error={treeQuery.error} onRetry={() => treeQuery.refetch()} skeletonVariant="list">
        {treeQuery.data ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-2 lg:col-span-2">
              <p className="px-2 pb-2 pt-1 text-2xs text-muted-foreground">{treeQuery.data.totalNodes} members shown</p>
              <TreeNodeRenderer kind={kind} node={treeQuery.data.root} depth={0} onSelect={setSelected} />
            </Card>

            <Card className="flex h-fit flex-col gap-2 p-4">
              <h2 className="text-sm font-semibold text-foreground">Member summary</h2>
              {selected ? (
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span className="text-sm font-medium text-foreground">{selected.displayName}</span>
                  <span className="num">{selected.memberId}</span>
                  <span>Status: {selected.membershipStatus}</span>
                  <span>Rank: {selected.rank ?? '—'}</span>
                  <span>Level: {selected.level}</span>
                  <span>Direct: {selected.directChildCount}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t('common.search')}</p>
              )}
            </Card>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}

function TreeNodeRenderer({ kind, node, depth, onSelect }: { kind: TreeKind; node: TreeNodeDto; depth: number; onSelect: (member: TreeNodeDto['member']) => void }) {
  const [expanded, setExpanded] = React.useState(depth < 1);
  const [loadedChildren, setLoadedChildren] = React.useState<TreeNodeDto[] | null>(node.children.length > 0 ? node.children : null);
  const needsFetch = node.hasMoreChildren && !loadedChildren;
  const subtreeQuery = useTree(kind, { rootMemberId: node.member.id, depth: 3 }, needsFetch && expanded);

  React.useEffect(() => {
    if (needsFetch && expanded && subtreeQuery.data) {
      setLoadedChildren(subtreeQuery.data.root.children);
    }
  }, [needsFetch, expanded, subtreeQuery.data]);

  const children = loadedChildren ?? node.children;
  const hasChildren = children.length > 0 || node.hasMoreChildren;

  return (
    <div>
      <TreeNode
        member={node.member}
        depth={depth}
        expanded={expanded}
        loading={needsFetch && expanded && subtreeQuery.isLoading}
        hasChildren={hasChildren}
        onToggle={() => setExpanded((v) => !v)}
        onSelect={() => onSelect(node.member)}
      />
      {expanded ? children.map((child) => <TreeNodeRenderer key={child.member.id} kind={kind} node={child} depth={depth + 1} onSelect={onSelect} />) : null}
    </div>
  );
}
