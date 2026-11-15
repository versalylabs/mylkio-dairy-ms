// How to reach Mylkio. One place, used by the website, Settings and the administration screens.
export const SUPPORT_PHONE_DISPLAY = '+254 184 129145';
export const SUPPORT_PHONE_DIGITS = '254184129145';
export const SUPPORT_EMAIL = 'versalylabs@gmail.com';

export const whatsappLink = (digits: string, text: string) =>
  `https://wa.me/${digits.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
