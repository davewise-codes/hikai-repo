/**
 * Genera iniciales a partir de un nombre o email.
 * Usado para mostrar en avatares cuando no hay imagen.
 *
 * @example
 * getInitials("John Doe") // "JD"
 * getInitials(null, "john@example.com") // "JO"
 * getInitials(null, null) // "??"
 */
export function getInitials(
  name?: string | null,
  email?: string | null
): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.slice(0, 2).toUpperCase() || "??";
}
