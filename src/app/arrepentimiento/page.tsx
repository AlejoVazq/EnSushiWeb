import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal/LegalPage';
import { buttonClassName } from '@/components/ui/Button';
import { BUSINESS } from '@/config/business';

export const metadata: Metadata = {
  title: `Botón de arrepentimiento · ${BUSINESS.name}`,
  description: `Cómo cancelar un pedido hecho en la web de ${BUSINESS.name}.`,
};

const message = 'Hola, quiero cancelar mi pedido (botón de arrepentimiento). Pedido #';
const whatsappUrl = `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(message)}`;
const mailUrl = `mailto:${BUSINESS.contact.email}?subject=${encodeURIComponent('Botón de arrepentimiento')}`;

export default function ArrepentimientoPage() {
  return (
    <LegalPage href="/arrepentimiento">
      <p>Si te arrepentiste de un pedido, avisanos lo antes posible. No hace falta tener cuenta ni dar explicaciones.</p>

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClassName({ size: 'lg', className: 'no-underline!' })}
        >
          Cancelar por WhatsApp
        </a>
        <a href={mailUrl} className={buttonClassName({ variant: 'secondary', size: 'lg', className: 'no-underline!' })}>
          Cancelar por correo
        </a>
      </div>
      <p className="text-sm text-washi-muted">
        Contanos el número de pedido (está en la página del pedido) o el nombre y el celular con que lo hiciste. En
        menos de 24 horas te mandamos un código que confirma que recibimos tu pedido de cancelación.
      </p>

      <h2>Antes de que lo confirmemos</h2>
      <p>Lo cancelamos sin costo. Si ya transferiste, te devolvemos el total.</p>

      <h2>Después de que lo confirmemos</h2>
      <p>
        Al confirmarlo empezamos a cocinarlo. Por ser comida hecha en el momento y que se echa a perder rápido, la ley
        no obliga a aceptar la devolución una vez preparada (artículo 1116 del Código Civil y Comercial). Igual
        escribinos: si todavía no empezamos, lo cancelamos.
      </p>
      <p>Si el pedido llegó mal, incompleto o no es lo que pediste, avisanos ese mismo día y lo resolvemos.</p>
    </LegalPage>
  );
}
