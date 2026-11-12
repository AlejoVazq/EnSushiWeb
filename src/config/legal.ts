/** Legal pages, in the order the footer and the pages' own nav show them */
export interface LegalPageLink {
  href: '/privacidad' | '/terminos' | '/cookies' | '/arrepentimiento';
  /** Footer and nav label */
  label: string;
  /** Page heading */
  title: string;
}

export const LEGAL_PAGES: readonly LegalPageLink[] = [
  { href: '/privacidad', label: 'Privacidad', title: 'Política de privacidad' },
  { href: '/terminos', label: 'Términos y condiciones', title: 'Términos y condiciones' },
  { href: '/cookies', label: 'Cookies', title: 'Cookies y datos del navegador' },
  { href: '/arrepentimiento', label: 'Botón de arrepentimiento', title: 'Botón de arrepentimiento' },
];

/** Last time any legal text changed, shown under each title */
export const LEGAL_UPDATED = '12 de noviembre de 2026';

/** National consumer-protection complaints form (Res. SC 38/2017 asks for this link and wording) */
export const CONSUMER_DEFENSE = {
  url: 'https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario',
  label: 'Defensa de las y los consumidores. Para reclamos ingrese aquí',
};
