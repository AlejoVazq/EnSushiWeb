import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal/LegalPage';
import { BUSINESS } from '@/config/business';

export const metadata: Metadata = {
  title: `Política de privacidad · ${BUSINESS.name}`,
  description: `Qué datos pide ${BUSINESS.name} para tomar tu pedido, para qué los usa y cómo pedir que los borremos.`,
};

const { email } = BUSINESS.contact;

export default function PrivacidadPage() {
  return (
    <LegalPage href="/privacidad">
      <p>
        En {BUSINESS.name} pedimos solo los datos que hacen falta para tomar, preparar y entregar tu pedido. Esta
        página explica cuáles son, para qué los usamos y cómo podés consultarlos, corregirlos o pedir que los borremos.
      </p>

      <h2>Quién es responsable de tus datos</h2>
      <p>
        {BUSINESS.name}, con domicilio en {BUSINESS.pickup.address}, {BUSINESS.pickup.city}. Para cualquier consulta
        sobre tus datos escribinos a <a href={`mailto:${email}`}>{email}</a> o por WhatsApp al{' '}
        {BUSINESS.whatsappDisplay}.
      </p>

      <h2>Qué datos pedimos</h2>
      <ul>
        <li>
          <strong>Tu correo</strong>, para mandarte el código de ingreso antes de tu primer pedido.
        </li>
        <li>
          <strong>Tu nombre y tu celular</strong>, para saber de quién es el pedido y escribirte por WhatsApp.
        </li>
        <li>
          <strong>Tu dirección</strong>, solo si elegís envío a domicilio.
        </li>
        <li>
          <strong>Tu pedido</strong>: lo que elegiste, el total, la forma de pago y de entrega, las observaciones que
          escribas y, si usaste uno, el código de descuento.
        </li>
      </ul>
      <p>No pedimos datos de tarjetas ni de cuentas bancarias: los pagos se arreglan por WhatsApp con el local.</p>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Preparar y entregar tu pedido, y avisarte por WhatsApp la hora o si no lo podemos tomar.</li>
        <li>Completar tus datos la próxima vez que pidas (nombre, celular y la dirección del último envío).</li>
        <li>Llevar las cuentas del local (ventas del día y de cada mes).</li>
        <li>Evitar pedidos falsos: por eso pedimos el código por correo.</li>
      </ul>
      <p>No usamos tus datos para publicidad, no los vendemos y no los compartimos con nadie para otros fines.</p>

      <h2>Con quién trabajamos</h2>
      <p>Para que la web funcione usamos estos servicios, que solo tratan los datos para eso:</p>
      <ul>
        <li>
          <strong>Hostinger</strong>: el servidor donde corre la web y se guardan los pedidos.
        </li>
        <li>
          <strong>Cloudflare</strong>: protege la web y la hace cargar más rápido; por ahí pasan las visitas.
        </li>
        <li>
          <strong>Resend</strong>: manda el correo con el código de ingreso.
        </li>
        <li>
          <strong>WhatsApp</strong>: el local te escribe a tu celular para confirmar el pedido.
        </li>
      </ul>
      <p>Algunos de estos servicios pueden guardar información fuera de la Argentina.</p>

      <h2>Cuánto tiempo los guardamos</h2>
      <ul>
        <li>El código de ingreso vence a los 10 minutos.</li>
        <li>La sesión dura 60 días desde la última vez que entrás; con &quot;Salir&quot; se cierra en el momento.</li>
        <li>
          Los pedidos se guardan mientras hagan falta para las cuentas del local. Si querés que borremos tus datos,
          pedínoslo.
        </li>
      </ul>

      <h2>Tus derechos</h2>
      <p>
        Podés pedir ver los datos que tenemos de vos, corregirlos o que los borremos, escribiendo a{' '}
        <a href={`mailto:${email}`}>{email}</a>. Te respondemos en un plazo máximo de 10 días hábiles.
      </p>
      <p>
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
        gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme
        lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326. La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA,
        en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y
        reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes
        en materia de protección de datos personales.
      </p>

      <h2>Cambios</h2>
      <p>
        Si cambiamos esta política, actualizamos la fecha de arriba. Si el cambio es importante, te lo avisamos antes
        de tu próximo pedido.
      </p>
    </LegalPage>
  );
}
