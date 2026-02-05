import type { IssueResponse } from "@/types/db";
import type { AdminIssueSummary } from "@/types/issue";
import IssueListItem from "./IssueListItem";

interface IssueListProps {
    issues: (IssueResponse | AdminIssueSummary)[];
    selectedId?: number | null;
    onSelect?: (id: number) => void;
}

export default function IssueList({ issues, selectedId, onSelect }: IssueListProps) {
    if (issues.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center text-slate-500 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-slate-50 p-3 rounded-full mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <p className="text-sm font-medium text-slate-600">현재 관리자가 담당한 구역에는</p>
                <p className="text-sm font-medium text-slate-600 mt-0.5">처리해야 할 이슈가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {issues.map((issue) => (
                <IssueListItem
                    key={issue.issueId}
                    issue={issue}
                    selected={selectedId === issue.issueId}
                    onClick={() => onSelect && onSelect(issue.issueId)}
                />
            ))}
        </div>
    );
}
