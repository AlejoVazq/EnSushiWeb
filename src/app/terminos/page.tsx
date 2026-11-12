import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalPage } from '@/components/legal/LegalPage';
import { BUSINESS, PAYMENT_METHOD_LABELS } from '@/config/business';
import { CONSUMER_DEFENSE } from '@/config/legal';
import { formatPrice } from '@/lib/format';
import { describeOpenDays } from '@/lib/schedule';

export const metadata: Metadata = {
  title: `Términos y condiciones · ${BUSINESS.name}`,
  description: `Cómo funcionan los pedidos online de ${BUSINESS.name}: horario, precios, pago, entrega y cancelaciones.`,
};

const { operatingHours, preorderCutoff } = BUSINESS.schedule;

export default function TerminosPage() {
  return (
    <LegalPage href="/terminos">
      <p>
        Estos términos explican cómo funcionan los pedidos que hacés en la web de {BUSINESS.name}. Al mandar un pedido
        los aceptás.
      </p>

      <h2>Pedidos</h2>
      <ul>
        <li>
          La web toma pedidos solo para el día: {describeOpenDays().toLowerCase()} de {operatingHours.open} a{' '}
          {operatingHours.close}. Para encargar otro día, escribinos por WhatsApp.
        </li>
        <li>
          Los rolls y nigiris de Arma tu combo se piden hasta las {preorderCutoff}. Después se puede pedir el resto
          del menú.
        </li>
        <li>
          Mandar el pedido no lo confirma. El local lo revisa y te escribe por WhatsApp con la hora aproximada, o te
          avisa si no lo puede tomar. Es una cocina: los horarios son aproximados.
        </li>
        <li>
          Antes del primer pedido te pedimos un código por correo, para evitar pedidos falsos. Podés tener hasta 3
          pedidos sin responder a la vez.
        </li>
      </ul>

      <h2>Precios</h2>
      <ul>
        <li>Los precios están en pesos argentinos y son los que ves en la web al momento de pedir.</li>
        <li>
          El envío a domicilio cuesta {formatPrice(BUSINESS.delivery.fee)} y se suma al total. Llegamos a Arrecifes y
          alrededores; si tu dirección queda lejos, te avisamos al confirmar.
        </li>
        <li>
          Los descuentos (días especiales y códigos) no se suman: se aplica el que más te conviene. Los códigos los da
          el local, pueden tener fecha de vencimiento y límite de usos, y no descuentan el envío.
        </li>
      </ul>

      <h2>Pago</h2>
      <ul>
        <li>
          Podés pagar en {PAYMENT_METHOD_LABELS.cash.toLowerCase()}, por {PAYMENT_METHOD_LABELS.transfer} o con las
          dos formas.
        </li>
        <li>
          No transfieras antes de que confirmemos el pedido. Al confirmarlo te pasamos el alias y el total por
          WhatsApp, y ahí mismo nos mandás el comprobante.
        </li>
      </ul>

      <h2>Entrega y retiro</h2>
      <ul>
        <li>
          Si elegís retiro, lo buscás en {BUSINESS.pickup.address}, {BUSINESS.pickup.city}, a la hora que te
          confirmemos.
        </li>
        <li>Si elegís envío, revisá que la dirección esté completa; si no te encontramos, te escribimos.</li>
      </ul>

      <h2>Cambios y cancelaciones</h2>
      <ul>
        <li>Antes de que lo confirmemos, podés cancelar o cambiar el pedido escribiéndonos por WhatsApp.</li>
        <li>
          Una vez confirmado, empezamos a cocinarlo: como es comida hecha en el momento, no se puede devolver. Mirá el{' '}
          <Link href="/arrepentimiento">Botón de arrepentimiento</Link>.
        </li>
        <li>Si algo llegó mal o falta algo, avisanos por WhatsApp ese mismo día y lo resolvemos.</li>
      </ul>

      <h2>Alergias</h2>
      <p>
        Nuestros productos llevan pescados y mariscos crudos o cocidos, soja, sésamo, gluten y lácteos, y se preparan
        en la misma cocina. Si tenés alguna alergia, escribila en las observaciones o consultanos antes de pedir.
      </p>

      <h2>Disponibilidad</h2>
      <p>
        Algunos productos se pueden agotar en el día; la web los marca como &quot;Agotado hoy&quot;. Las fotos son
        ilustrativas.
      </p>

      <h2>Reclamos</h2>
      <p>
        Ante cualquier problema escribinos a <a href={`mailto:${BUSINESS.contact.email}`}>{BUSINESS.contact.email}</a>{' '}
        o por WhatsApp al {BUSINESS.whatsappDisplay}. También podés hacer un reclamo en{' '}
        <a href={CONSUMER_DEFENSE.url} target="_blank" rel="noopener noreferrer">
          Defensa de las y los consumidores
        </a>
        . Estos términos se rigen por las leyes de la República Argentina, incluida la Ley 24.240 de Defensa del
        Consumidor.
      </p>
    </LegalPage>
  );
}
