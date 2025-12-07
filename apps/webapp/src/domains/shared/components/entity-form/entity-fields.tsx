import { Input, Label, Textarea } from "@hikai/ui";
import { generateSlug, shouldAutoUpdateSlug } from "../../utils";

export interface EntityFieldsValues {
  name: string;
  slug: string;
  description: string;
}

export interface EntityFieldsLabels {
  name: string;
  namePlaceholder: string;
  slug: string;
  slugPlaceholder: string;
  slugHint: string;
  description: string;
  descriptionPlaceholder: string;
}

interface EntityFieldsProps {
  /** Current field values */
  values: EntityFieldsValues;
  /** Callback when any field changes */
  onValuesChange: (values: EntityFieldsValues) => void;
  /** Labels and placeholders (for i18n) */
  labels: EntityFieldsLabels;
  /** Whether fields are disabled (e.g., during loading) */
  isLoading?: boolean;
  /** Prefix for input IDs (e.g., "org" or "product") */
  idPrefix: string;
}

/**
 * Shared fields for entity creation: name, slug (auto-generated), and description.
 * Handles auto-slug generation when name changes.
 */
export function EntityFields({
  values,
  onValuesChange,
  labels,
  isLoading = false,
  idPrefix,
}: EntityFieldsProps) {
  const handleNameChange = (newName: string) => {
    onValuesChange({
      ...values,
      name: newName,
      slug: shouldAutoUpdateSlug(values.slug, values.name)
        ? generateSlug(newName)
        : values.slug,
    });
  };

  const handleSlugChange = (newSlug: string) => {
    onValuesChange({
      ...values,
      slug: newSlug,
    });
  };

  const handleDescriptionChange = (newDescription: string) => {
    onValuesChange({
      ...values,
      description: newDescription,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={`${idPrefix}-name`}>{labels.name} *</Label>
        <Input
          id={`${idPrefix}-name`}
          type="text"
          value={values.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder={labels.namePlaceholder}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-slug`}>{labels.slug} *</Label>
        <Input
          id={`${idPrefix}-slug`}
          type="text"
          value={values.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder={labels.slugPlaceholder}
          required
          disabled={isLoading}
          pattern="^[a-z0-9-]+$"
          title={labels.slugHint}
        />
        <p className="text-xs text-muted-foreground mt-1">{labels.slugHint}</p>
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-description`}>{labels.description}</Label>
        <Textarea
          id={`${idPrefix}-description`}
          value={values.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleDescriptionChange(e.target.value)
          }
          placeholder={labels.descriptionPlaceholder}
          rows={3}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
