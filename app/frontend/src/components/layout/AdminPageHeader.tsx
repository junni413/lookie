import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface PageHeaderProps {
    title: string;
    description?: string;
    children?: ReactNode; // For right-side actions
    className?: string;
}

export default function AdminPageHeader({ title, description, children, className }: PageHeaderProps) {
    return (
        <div className={cn("shrink-0 px-8 pt-8 pb-6 flex items-center justify-between bg-[#f8f9fc]", className)}>
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{title}</h1>
                {description && (
                    <p className="text-sm text-slate-500 font-medium mt-1">{description}</p>
                )}
            </div>

            {children && (
                <div className="flex items-center gap-4">
                    {children}
                </div>
            )}
        </div>
    );
}
