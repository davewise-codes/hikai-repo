import { type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Plus,
} from "@hikai/ui";

interface EntityFormCardProps {
  /** Whether the form is expanded */
  isOpen: boolean;
  /** Callback when toggle is clicked */
  onOpenChange: (open: boolean) => void;
  /** Label for the collapsed button (e.g., "Create organization") */
  collapsedButtonLabel: string;
  /** Title shown when expanded */
  title: string;
  /** Description shown when expanded */
  description?: string;
  /** Form content (only rendered when open) */
  children: ReactNode;
  /** Additional class name for the card */
  className?: string;
}

/**
 * Card wrapper for entity creation forms with toggle open/closed state.
 * When collapsed, shows a compact card with title and button.
 * When expanded, shows the full form.
 */
export function EntityFormCard({
  isOpen,
  onOpenChange,
  collapsedButtonLabel,
  title,
  description,
  children,
  className,
}: EntityFormCardProps) {
  if (!isOpen) {
    return (
      <Card className={`border-dashed ${className ?? ""}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-fontSize-sm">{title}</p>
              {description && (
                <p className="text-fontSize-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              {collapsedButtonLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
