exports = module.exports = {

  permalink: function (type, description) {
    'use strict';
    var name = type.substring(1);

    return {
      type: 'object',
      properties: {
        href: {
          type: 'string',
          pattern: '^\/' + name + '\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',
          description: description
        }
      },
      required: ['href']
    };
  },

  string: function (description, min, max) {
    'use strict';
    var ret = {
      type: 'string',
      description: description
    };
    if (min) {
      ret.minLength = min;
    }
    if (max) {
      ret.maxLength = max;
    }

    return ret;
  },

  numeric: function (description, min, max) {
    'use strict';
    const ret = {
      type: 'number',
      description: description
    };
    if (min || min == 0) {
      ret.minimum = min;
    }
    if (max) {
      ret.maximum = max;
    }

    return ret;
  },

  email: function (description) {
    'use strict';
    return {
      type: 'string',
      format: 'email',
      minLength: 1,
      maxLength: 254,
      description: description
    };
  },

  url: function (description) {
    'use strict';
    return {
      type: 'string',
      minLength: 1,
      maxLength: 2000,
      format: 'uri',
      description: description
    };
  },

  belgianzipcode: function (description) {
    'use strict';
    return {
      type: 'string',
      pattern: '^[0-9][0-9][0-9][0-9]$',
      description: description
    };
  },

  phone: function (description) {
    'use strict';
    return {
      type: 'string',
      pattern: '^[0-9]*$',
      minLength: 9,
      maxLength: 10,
      description: description
    };
  },

  guid: function (description) {
    'use strict';
    return {
      type: 'string',
      description: description,
      pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'

    };
  },

  timestamp: function (description) {
    'use strict';
    return {
      type: 'string',
      format: 'date-time',
      description: description
    };
  },

  'boolean': function (description) { //eslint-disable-line
    return {
      type: 'boolean',
      description: description
    };
  },

  array: function (description) {
    'use strict';
    var ret = {
      type: 'array',
      description: description
    };
    return ret;
  },

  patchSchemaToDisallowAdditionalProperties: function patchSchemaToDisallowAdditionalProperties(schema) {
    'use strict';
    const patchedSchema = { ...schema };
    if (patchedSchema.properties && patchedSchema.additionalProperties === undefined) {
      patchedSchema.additionalProperties = false;
      patchedSchema.properties = {}
      Object.entries(schema.properties)
          .forEach(e => patchedSchema.properties[e[0]] = patchSchemaToDisallowAdditionalProperties(e[1]))

      /* from NodeJS 12 and up could be something like
      patchedSchema.properties = Object.fromEntries(
        Object.entries(patchedSchema.properties)
          .map(e => [e[0], patchSchemaToDisallowAdditionalProperties(e[1])])
      );
      */
    }
    return patchedSchema;
  }
};
