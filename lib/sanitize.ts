/**
 * Utilidades para sanitizar inputs y prevenir XSS
 */

/**
 * Sanitiza texto eliminando HTML y caracteres potencialmente peligrosos
 * Útil para nombres de usuarios, descripciones, etc.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';

  return (
    text
      // Eliminar tags HTML
      .replace(/<[^>]*>/g, '')
      // Eliminar caracteres de control
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Normalizar espacios
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Sanitiza nombre de usuario
 * Permite letras, números, espacios, guiones y apóstrofes
 */
export function sanitizeName(name: string): string {
  if (!name) return '';

  return (
    sanitizeText(name)
      // Permitir solo caracteres seguros para nombres
      // Letras (incluyendo acentos), números, espacios, guiones, apóstrofes, puntos
      .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\-'.]/g, '')
      .trim()
  );
}

/**
 * Sanitiza email
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  return email.toLowerCase().trim();
}

/**
 * Valida y sanitiza ObjectId de MongoDB
 */
export function sanitizeObjectId(id: string): string {
  if (!id) return '';

  // Solo permitir caracteres hexadecimales (válidos para ObjectId)
  return id.replace(/[^a-f0-9]/gi, '').slice(0, 24);
}

/**
 * Escapa caracteres especiales para uso seguro en HTML
 * (React ya hace esto automáticamente, pero útil para otros contextos)
 */
export function escapeHtml(text: string): string {
  if (!text) return '';

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Valida que un string no contenga contenido malicioso
 */
export function containsMaliciousContent(text: string): boolean {
  if (!text) return false;

  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
  ];

  return maliciousPatterns.some((pattern) => pattern.test(text));
}
