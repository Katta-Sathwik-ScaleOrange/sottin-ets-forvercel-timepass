const axios = require('axios');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

/**
 * Search Google Places API (New) for office buildings
 * @param {string} query - search text
 * @param {object} options - { location: {lat, lng}, radius, type }
 */
exports.searchGooglePlaces = async (query, options = {}) => {
  if (!API_KEY) {
    console.warn('Google Places API key not configured');
    return [];
  }

  try {
    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      {
        textQuery: query,
        locationBias: {
          circle: {
            center: {
              latitude: options.location?.lat || 17.42,
              longitude: options.location?.lng || 78.35,
            },
            radius: options.radius || 15000,
          },
        },
        includedType: options.type || 'establishment',
        maxResultCount: 5,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id',
        },
      }
    );

    return (response.data.places || []).map((place) => ({
      name: place.displayName?.text || '',
      area: place.formattedAddress || '',
      lat: place.location?.latitude,
      lng: place.location?.longitude,
      place_id: place.id,
      source: 'google',
    }));
  } catch (e) {
    console.error('Google Places API error:', e.message);
    return [];
  }
};

exports.getPlaceDetails = async (placeId) => {
  if (!API_KEY) return null;

  try {
    const response = await axios.get(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'displayName,formattedAddress,location,id',
        },
      }
    );
    return response.data;
  } catch (e) {
    console.error('Google Place Details error:', e.message);
    return null;
  }
};
