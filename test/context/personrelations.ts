// Messages relations
module.exports = function (sri4node) {
  const $s = sri4node.schemaUtils;
  return {
    type: '/personrelations',
    metaType: 'SRI4NODE_PERSON_RELATION',
    'public': false, // eslint-disable-line
    map: {
      key: {},
      from: {references: '/persons'},
      to: {references: '/persons'},
      type: {},
      startdate: {},
      enddate: {}
    },
    query: {
      status: (value, select) => {
        const today = (new Date()).toISOString().substring(0,10);

        switch (value) {
          case "ACTIVE":
            select.sql(
              ' AND ("startdate" <= \'' +
                today +
                "' AND (" +
                '"enddate" >= \'' +
                today +
                '\' OR "enddate" IS NULL))'
            );
            break;
          case "FUTURE":
            select.sql(' AND "startdate" > \'' + today + "'");
            break;
          case "ABOLISHED":
            select.sql(' AND "enddate" < \'' + today + "'");
            break;
          case "ACTIVE,FUTURE":
            select.sql(
              ' AND ("enddate" IS NULL OR "enddate" >= \'' + today + "')"
            );
            break;
          default:
            throw new sri4node.SriError({ status: 409, errors: [{ code: 'status.filter.value.unknown', value }] });
        }
      },
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A relation between perons.',
      type: 'object',
      properties: {
        key: $s.guid('GUID for this relation.'),
        from: $s.permalink('/persons', 'Relation From person.'),
        to: $s.permalink('/persons', 'Relation To person.'),
        type: $s.string('Type of the relation.'),
        startdate: {
          type: 'string',
          format: 'date',
          description: 'Validity start date of the relation.'
        },
        enddate: {
          type: 'string',
          format: 'date',
          description: 'Validity end date of the relation.'
        }
      },
      required: ['key', 'from', 'to', 'type']
    }
  };
};
