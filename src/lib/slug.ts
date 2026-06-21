/**
 * Vytvoří URL slug z názvu — odstraní diakritiku, nealfanumerické znaky na pomlčky.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // kombinující diakritická znaménka
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}
