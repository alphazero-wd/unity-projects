import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FormEvent } from "react";

function usePaymentForm() {
  const stripe = useStripe();
  const elements = useElements();

  const getPaymentMethodId = async () => {
    const cardElement = elements?.getElement(CardElement);

    if (!stripe || !elements || !cardElement) {
      return;
    }

    const stripeResponse = await stripe?.createPaymentMethod({
      type: "card",
      card: cardElement,
    });

    const { error, paymentMethod } = stripeResponse;

    if (error || !paymentMethod) {
      return;
    }

    return paymentMethod.id;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const paymentMethodId = await getPaymentMethodId();

    if (!paymentMethodId) {
      return;
    }

    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/credit-cards/add`,
      {
        method: "POST",
        body: JSON.stringify({
          paymentMethodId,
        }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const responseJson = await response.json();

    const clientSecret = responseJson.client_secret;

    stripe?.confirmCardSetup(clientSecret);

    const chargeResponse = await fetch(
      `${process.env.REACT_APP_API_URL}/charge`,
      {
        method: "POST",
        body: JSON.stringify({
          paymentMethodId,
          amount: 100,
        }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const chargeResponseJson = await chargeResponse.json();

    if (chargeResponseJson.status !== "succeeded") {
      const secret = chargeResponseJson.client_secret;

      await stripe?.confirmCardPayment(secret);
    }
  };

  return {
    handleSubmit,
  };
}

export default usePaymentForm;
