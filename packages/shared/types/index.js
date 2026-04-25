/**
 * Shared type definitions (JSDoc)
 * Used across api, web, and admin packages
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} google_id
 * @property {string} name
 * @property {string} email
 * @property {string} [phone]
 * @property {string} [avatar_url]
 * @property {'rider'|'admin'|'ops'} role
 * @property {boolean} whatsapp_opt
 */

/**
 * @typedef {Object} Apartment
 * @property {string} id
 * @property {string} name
 * @property {string[]} aliases
 * @property {string} area
 * @property {number} lat
 * @property {number} lng
 * @property {boolean} verified
 */

/**
 * @typedef {Object} Office
 * @property {string} id
 * @property {string} name
 * @property {string} [short_name]
 * @property {string[]} aliases
 * @property {string} area
 * @property {number} lat
 * @property {number} lng
 * @property {Array<{label: string, lat: number, lng: number}>} gates
 * @property {boolean} verified
 * @property {number} selection_count
 */

/**
 * @typedef {Object} PricingResult
 * @property {number} perTripOnward
 * @property {number|null} perTripReturn
 * @property {number} total
 */

module.exports = {};
