import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Variant = "default" | "primary" | "alert" | "progress";

interface StatusCardProps {
  title: string;
  value: string | number;
  description?: string;
  variant?: Variant;
  progressValue?: number; // 0~100
}

export default function StatusCard({
  title,
  value,
  description,
  variant = "default",
  progressValue,
}: StatusCardProps) {
  const border =
    variant === "primary"
      ? "border-primary/30"
      : variant === "alert"
      ? "border-destructive/30"
      : "border-border";

  const valueColor =
    variant === "primary"
      ? "text-primary"
      : variant === "alert"
      ? "text-destructive"
      : "text-foreground";

  return (
    <Card className={border}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className={`text-2xl font-semibold ${valueColor}`}>{value}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
        {variant === "progress" && typeof progressValue === "number" && (
          <Progress value={progressValue} />
        )}
      </CardContent>
    </Card>
  );
}
