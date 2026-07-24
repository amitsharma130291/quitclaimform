import Stripe from 'stripe';

export const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export const DEED_PRICE_CENTS = 1499; // $14.99
