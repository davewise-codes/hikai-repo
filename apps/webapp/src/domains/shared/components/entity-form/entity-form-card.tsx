import { type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
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
 * When collapsed, shows a button to expand. When expanded, shows the form.
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
      <Card className={className}>
        <CardContent className="pt-6">
          <Button onClick={() => onOpenChange(true)} className="w-full">
            + {collapsedButtonLabel}
          </Button>
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
