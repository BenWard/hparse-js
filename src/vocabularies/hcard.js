/** hcard for hparse
Maps the hcard µf1 vocabulary to µf2
*/
var exports = exports || window;

if (exports.hparse) {
  exports.hparse.addLegacyVocabulary('h-adr', {
    'root': ['adr'],
    'extended-address': 'p-extended-address',
    'street-address': 'p-street-address',
    'locality': 'p-locality',
    'region': 'p-region',
    'country-name': 'p-country-name',
    'postal-code': 'p-postal-code'
  });

  exports.hparse.addLegacyVocabulary('h-card', {
    'root': ['hcard', 'vcard'],
    'fn': 'p-name',
    'given-name': 'p-given-name',
    'additional-name': 'p-additional-name',
    'family-name': 'p-family-name',
    'title': 'p-title',
    'org': 'p-org',
    'organization-name': 'p-organization-name',
    'organization-department': 'p-organization-department',
    'adr': 'h-adr',
    'geo': 'h-geo',
    'label': 'h-label'
  });
}