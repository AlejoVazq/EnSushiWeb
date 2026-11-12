import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal/LegalPage';
import { BUSINESS } from '@/config/business';

export const metadata: Metadata = {
  title: `Cookies · ${BUSINESS.name}`,
  description: `Qué guarda la web de ${BUSINESS.name} en tu navegador y para qué.`,
};

export default function CookiesPage() {
  return (
    <LegalPage href="/cookies">
      <p>
        La web guarda muy poco en tu navegador, y solo para que funcione: para mantener tu sesión y para no perder tu
        pedido si recargás la página. <strong>No usamos cookies de publicidad ni de estadísticas</strong>, ni
        herramientas que sigan lo que hacés en otras páginas.
      </p>

      <h2>Cookie de sesión</h2>
      <ul>
        <li>
          <strong>ensushi_sesion</strong>: recuerda que ya ingresaste con tu correo, así no te pedimos el código cada
          vez. Dura 60 días desde la última vez que entrás y se borra con &quot;Salir&quot;. Solo la lee nuestro
          servidor; la web no puede leerla.
        </li>
      </ul>

      <h2>Datos guardados en tu navegador</h2>
      <p>Esto no viaja a ningún lado: queda en tu celular o tu computadora.</p>
      <ul>
        <li>
          <strong>sushi-cart</strong>: lo que pusiste en el pedido, para que no se pierda si cerrás la página.
        </li>
        <li>
          <strong>ensushi-celular</strong>: tu celular, para completarlo solo la próxima vez.
        </li>
        <li>
          <strong>ensushi-checkout</strong>: lo que vas escribiendo en el checkout (entrega, pago, observaciones). Se
          borra al cerrar la pestaña.
        </li>
      </ul>

      <h2>Cookies de Cloudflare</h2>
      <p>
        Cloudflare, el servicio que protege la web, puede poner una cookie técnica (como <strong>__cf_bm</strong>) para
        distinguir personas de robots. No sirve para identificarte ni para publicidad.
      </p>

      <h2>Cómo borrarlas</h2>
      <p>
        Podés borrar todo desde la configuración de tu navegador (&quot;Borrar datos de navegación&quot; o
        &quot;Cookies y datos de sitios&quot;). Si lo hacés, se vacía tu pedido y vas a tener que ingresar de nuevo con
        tu correo.
      </p>
    </LegalPage>
  );
}
