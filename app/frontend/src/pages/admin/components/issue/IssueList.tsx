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
                    key={issue.issue_id}
                    issue={issue}
                    selected={selectedId === issue.issue_id}
                    onClick={() => onSelect && onSelect(issue.issue_id)}
                />
            ))}
        </div>
    );
}
