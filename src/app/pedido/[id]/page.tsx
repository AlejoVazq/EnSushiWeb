import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderStatus } from "@/components/checkout/OrderStatus";
import { BUSINESS } from "@/config/business";

export const metadata: Metadata = {
  title: `Tu pedido · ${BUSINESS.name}`,
  robots: { index: false },
};

/** After sending an order by app: its status, read on the client (the id comes from the URL) */
export default function OrderPage() {
  return (
    <Suspense>
      <OrderStatus />
    </Suspense>
  );
}
