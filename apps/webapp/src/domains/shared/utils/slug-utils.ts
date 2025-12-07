/**
 * Genera un slug URL-friendly a partir de un nombre.
 *
 * @example
 * generateSlug("My Product Name") // "my-product-name"
 * generateSlug("Café & Co.") // "caf-co"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 50);
}

/**
 * Determina si el slug debe actualizarse automáticamente al cambiar el nombre.
 * Retorna true si el slug actual coincide con el generado del nombre actual,
 * o si el slug está vacío.
 *
 * @example
 * // En un handler de cambio de nombre:
 * const handleNameChange = (value: string) => {
 *   setFormData((prev) => ({
 *     ...prev,
 *     name: value,
 *     slug: shouldAutoUpdateSlug(prev.slug, prev.name)
 *       ? generateSlug(value)
 *       : prev.slug,
 *   }));
 * };
 */
export function shouldAutoUpdateSlug(
  currentSlug: string,
  currentName: string
): boolean {
  return currentSlug === generateSlug(currentName) || currentSlug === "";
}
