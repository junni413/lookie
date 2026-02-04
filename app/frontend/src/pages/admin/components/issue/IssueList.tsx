import type { IssueResponse } from "@/types/db";
import IssueListItem from "./IssueListItem";

interface IssueListProps {
    issues: IssueResponse[];
    selectedId?: number | null;
    onSelect?: (id: number) => void;
}

export default function IssueList({ issues, selectedId, onSelect }: IssueListProps) {
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
