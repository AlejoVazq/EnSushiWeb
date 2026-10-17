import type { Metadata } from "next";

import { Checkout } from "@/components/checkout/Checkout";
import { BUSINESS } from "@/config/business";

export const metadata: Metadata = {
  title: `Finalizar pedido · ${BUSINESS.name}`,
};

export default function CheckoutPage() {
  return <Checkout />;
}
