const axios = require('axios');

const API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const BASE_URL = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}`;

/**
 * Send a WhatsApp template message
 */
exports.sendTemplate = async (to, templateName, parameters = []) => {
  if (!API_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('WhatsApp API not configured — skipping notification');
    return null;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: parameters.length > 0 ? [{
            type: 'body',
            parameters: parameters.map(p => ({ type: 'text', text: p })),
          }] : undefined,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (e) {
    console.error('WhatsApp API error:', e.response?.data || e.message);
    return null;
  }
};

/**
 * Send booking confirmation
 */
exports.sendBookingConfirmation = async (user, bookingDetails) => {
  if (!user.whatsapp_opt || !user.phone) return null;

  return exports.sendTemplate(user.phone, 'booking_confirmation', [
    bookingDetails.routeName,
    bookingDetails.dates.join(', '),
    `₹${bookingDetails.total}`,
  ]);
};

/**
 * Send trip reminder (night before)
 */
exports.sendTripReminder = async (user, tripDetails) => {
  if (!user.whatsapp_opt || !user.phone) return null;

  return exports.sendTemplate(user.phone, 'trip_reminder', [
    tripDetails.departureTime,
    tripDetails.stopName,
    tripDetails.routeName,
  ]);
};

/**
 * Send route launch announcement
 */
exports.sendRouteLaunch = async (user, routeDetails) => {
  if (!user.whatsapp_opt || !user.phone) return null;

  return exports.sendTemplate(user.phone, 'route_launch', [
    routeDetails.routeName,
    routeDetails.originArea,
    routeDetails.destinationArea,
  ]);
};

/**
 * Send booking window open notification
 */
exports.sendBookingWindowOpen = async (user, monthName) => {
  if (!user.whatsapp_opt || !user.phone) return null;

  return exports.sendTemplate(user.phone, 'booking_window_open', [
    monthName,
  ]);
};

