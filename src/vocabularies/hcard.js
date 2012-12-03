/** hcard for hparse
Maps the hcard µf1 vocabulary to µf2
*/
if (HParse) {
  HParse.defineLegacyVocabulary('h-adr', {
    'root': ['adr'],
    'properties': {
      'extended-address': 'p-extended-address',
      'street-address': 'p-street-address',
      'locality': 'p-locality',
      'region': 'p-region',
      'country-name': 'p-country-name',
      'postal-code': 'p-postal-code'
    }
  });

  HParse.defineLegacyVocabulary('h-card', {
    'root': ['hcard', 'vcard'],
    'properties': {
      'fn': 'p-name',
      'given-name': 'p-given-name',
      'additional-name': 'p-additional-name',
      'family-name': 'p-family-name',
      'title': 'p-title',
      'org': 'p-org',
      'organization-name': 'p-organization-name',
      'organization-department': 'p-organization-department',
      'adr': 'p-adr',
      'geo': 'p-geo',
      'label': 'p-label'
    }
  });
}