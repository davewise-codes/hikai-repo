import { Input, Label, Textarea } from "@hikai/ui";
import { generateSlug, shouldAutoUpdateSlug } from "../../utils";

export interface EntityFieldsValues {
  name: string;
  slug: string;
  description?: string;
}

export interface EntityFieldsLabels {
  name: string;
  namePlaceholder: string;
  nameHelp?: string;
  slug: string;
  slugPlaceholder: string;
  slugHint: string;
  slugHelp?: string;
  description?: string;
  descriptionPlaceholder?: string;
  descriptionHelp?: string;
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
  /** Whether to show description field */
  showDescription?: boolean;
}

/**
 * Shared fields for entity creation: name + slug (auto-generated),
 * with optional description support when enabled.
 */
export function EntityFields({
  values,
  onValuesChange,
  labels,
  isLoading = false,
  idPrefix,
  showDescription = true,
}: EntityFieldsProps) {
  const placeholderClassName = "placeholder:italic placeholder:text-muted-foreground/70";
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
    <div className="space-y-[var(--spacing-field-group)]">
      <div>
        <Label htmlFor={`${idPrefix}-name`}>{labels.name} *</Label>
        {labels.nameHelp ? (
          <p className="text-fontSize-xs text-muted-foreground mt-[var(--spacing-field-description)]">
            {labels.nameHelp}
          </p>
        ) : null}
        <Input
          id={`${idPrefix}-name`}
          type="text"
          value={values.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder={labels.namePlaceholder}
          required
          disabled={isLoading}
          className={`${placeholderClassName} mt-[var(--spacing-field-description)]`}
        />
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-slug`}>{labels.slug} *</Label>
        <p className="text-fontSize-xs text-muted-foreground mt-[var(--spacing-field-description)]">
          {labels.slugHint}
        </p>
        {labels.slugHelp ? (
          <p className="text-fontSize-xs text-muted-foreground mt-[var(--spacing-field-description)]">
            {labels.slugHelp}
          </p>
        ) : null}
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
          className={`${placeholderClassName} mt-[var(--spacing-field-description)]`}
        />
      </div>

      {showDescription ? (
        <div>
          <Label htmlFor={`${idPrefix}-description`}>{labels.description}</Label>
          {labels.descriptionHelp ? (
            <p className="text-fontSize-xs text-muted-foreground mt-[var(--spacing-field-description)]">
              {labels.descriptionHelp}
            </p>
          ) : null}
          <Textarea
            id={`${idPrefix}-description`}
            value={values.description ?? ""}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              handleDescriptionChange(e.target.value)
            }
            placeholder={labels.descriptionPlaceholder}
            rows={3}
            disabled={isLoading}
            className={`${placeholderClassName} mt-[var(--spacing-field-description)]`}
          />
        </div>
      ) : null}
    </div>
  );
}
